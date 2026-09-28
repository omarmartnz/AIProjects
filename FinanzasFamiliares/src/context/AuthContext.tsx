import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  updateProfile,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  runTransaction,
} from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';
import { UserProfile, FamilyWorkspace, FamilyState, FamilyInvite, FamilyEncryptedState } from '../types';
import { initialFamilyState } from '../data/initialData';
import { sanitizeForFirestore } from '../utils/firestoreSanitizer';
import { generate256BitInviteToken, sanitizeInviteToken } from '../utils/crypto';

export interface ParentPermissionCheck {
  isParent: boolean;
  allowed: boolean;
  roleName: string;
  memberRole: string;
  reason?: string;
}

/**
 * Checks whether the current user is authorized as a Parent or Owner of the family.
 * Strictly enforces that only "Padre" or "Madre" (or the family creator/owner)
 * can create family invitations.
 */
export function checkParentPermission(
  user: User | null,
  family: FamilyWorkspace | null
): ParentPermissionCheck {
  if (!user || !family) {
    return {
      isParent: false,
      allowed: false,
      roleName: 'Sin autenticación',
      memberRole: 'Sin autenticación',
      reason: 'Debes iniciar sesión y seleccionar un hogar activo.',
    };
  }

  // 1. If user is the creator/owner of the workspace, they have authority
  const isOwner = family.ownerId === user.uid;

  // 2. Look up member entry for the user in the family state
  const members = family.state?.members || [];
  const currentMember = members.find(
    (m) =>
      m.uid === user.uid ||
      (user.email && m.email && m.email.toLowerCase() === user.email.toLowerCase()) ||
      m.id === `mem-${user.uid.slice(0, 8)}`
  );

  const role = currentMember?.role;
  const isParentMarked = Array.isArray(family.parentUids) && family.parentUids.includes(user.uid);
  const normalizedRole = (role || '').toLowerCase();
  const isParentRole =
    normalizedRole.includes('padre') ||
    normalizedRole.includes('madre') ||
    role === 'Padre / Esposo' ||
    role === 'Madre / Esposa' ||
    role === 'Padre' ||
    role === 'Madre';

  if (isOwner || isParentMarked || isParentRole) {
    const roleTitle = role || (isOwner ? 'Padre / Creador' : 'Padre / Madre');
    return {
      isParent: true,
      allowed: true,
      roleName: roleTitle,
      memberRole: roleTitle,
    };
  }

  const fallbackRole = role || 'Familiar';
  return {
    isParent: false,
    allowed: false,
    roleName: fallbackRole,
    memberRole: fallbackRole,
    reason:
      'Acceso restringido: Únicamente los usuarios con rol de Padre o Madre (o administradores del hogar) pueden generar códigos de invitación.',
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userProfile: UserProfile | null;
  currentFamilyId: string | null;
  activeFamily: FamilyWorkspace | null;
  userFamilies: Array<{ id: string; familyName: string; inviteCode?: string; isOwner: boolean }>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  signInAsGuest: (name?: string) => Promise<void>;
  logout: () => Promise<void>;
  logOut: () => Promise<void>;
  switchFamily: (familyId: string) => Promise<void>;
  createFamily: (name: string, withDemoData?: boolean, currencyCode?: string, currencySymbol?: string) => Promise<string>;
  createInvite: (familyId?: string) => Promise<{
    success: boolean;
    invite?: FamilyInvite;
    token?: string;
    expiresAt?: number;
    formattedExpiry?: string;
    message?: string;
  }>;
  revokeInvite: (token: string) => Promise<{ success: boolean; message: string }>;
  joinFamilyByCode: (codeOrToken: string) => Promise<{ success: boolean; message: string }>;
  updateFamilyState: (payload: { state: FamilyState; stateEncrypted?: FamilyEncryptedState; encryptionMode?: 'strict' | 'compat' }) => Promise<void>;
  deleteFamily: (familyId?: string) => Promise<{ success: boolean; message: string }>;
  canCreateInvite: boolean;
  userParentCheck: (family?: FamilyWorkspace | string | null) => ParentPermissionCheck;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentFamilyId, setCurrentFamilyId] = useState<string | null>(null);
  const [activeFamily, setActiveFamily] = useState<FamilyWorkspace | null>(null);
  const [userFamilies, setUserFamilies] = useState<Array<{ id: string; familyName: string; inviteCode?: string; isOwner: boolean }>>([]);

  // Auth State Listener
  useEffect(() => {
    const authInitTimeout = window.setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn('Auth initialization timeout: continuing in guest/login mode to avoid infinite splash screen.');
          return false;
        }
        return prev;
      });
    }, 10000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      window.clearTimeout(authInitTimeout);
      setUser(firebaseUser);
      if (!firebaseUser) {
        setUserProfile(null);
        setCurrentFamilyId(null);
        setActiveFamily(null);
        setUserFamilies([]);
        setLoading(false);
        return;
      }

      // Check or create user document in Firestore
      const userRef = doc(db, 'users', firebaseUser.uid);
      try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || null,
            displayName: firebaseUser.displayName || 'Usuario Familiar',
            photoURL: firebaseUser.photoURL || null,
            currentFamilyId: null,
            familyIds: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await setDoc(userRef, newProfile);
          setUserProfile(newProfile);
        } else {
          setUserProfile(snap.data() as UserProfile);
        }
      } catch (err) {
        console.error('Error fetching/creating user doc:', err);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      window.clearTimeout(authInitTimeout);
      console.error('Error in onAuthStateChanged:', error);
      setLoading(false);
    });

    return () => {
      window.clearTimeout(authInitTimeout);
      unsubscribe();
    };
  }, []);

  // Listen to user profile changes
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setUserProfile(data);
        if (data.currentFamilyId) {
          setCurrentFamilyId(data.currentFamilyId);
        } else if (data.familyIds && data.familyIds.length > 0) {
          setCurrentFamilyId(data.familyIds[0]);
        } else {
          setCurrentFamilyId(null);
        }
      }
    });
    return () => unsub();
  }, [user]);

  // Listen to user's families list
  useEffect(() => {
    if (!user || !userProfile?.familyIds || userProfile.familyIds.length === 0) {
      setUserFamilies([]);
      return;
    }

    const loadFamilies = async () => {
      try {
        const familiesData: Array<{ id: string; familyName: string; inviteCode?: string; isOwner: boolean }> = [];
        for (const fId of userProfile.familyIds) {
          const fRef = doc(db, 'families', fId);
          const fSnap = await getDoc(fRef);
          if (fSnap.exists()) {
            const data = fSnap.data();
            familiesData.push({
              id: fId,
              familyName: data.familyName || 'Hogar Familiar',
              inviteCode: data.inviteCode || undefined,
              isOwner: data.ownerId === user.uid,
            });
          }
        }
        setUserFamilies(familiesData);
      } catch (err) {
        console.error('Error loading families list:', err);
      }
    };

    loadFamilies();
  }, [user, userProfile?.familyIds]);

  // Listen to active family document in real time
  useEffect(() => {
    if (!currentFamilyId || !user) {
      setActiveFamily(null);
      return;
    }

    const familyRef = doc(db, 'families', currentFamilyId);
    const unsub = onSnapshot(
      familyRef,
      (snap) => {
        if (snap.exists()) {
          const famData = snap.data() as FamilyWorkspace;
          // Security verification: ensure current authenticated user is authorized for this family
          const isAuthorized = famData.ownerId === user.uid || (famData.memberUids && famData.memberUids.includes(user.uid));
          if (!isAuthorized) {
            console.warn(`[Security Alert] Acceso no autorizado al espacio familiar ${currentFamilyId} para el usuario ${user.uid}`);
            setActiveFamily(null);
            return;
          }
          setActiveFamily(famData);
        } else {
          setActiveFamily(null);
        }
      },
      (error) => {
        console.warn('Error listening to family doc:', error);
      }
    );

    return () => unsub();
  }, [currentFamilyId, user]);

  // Auth Methods
  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      throw err;
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), pass);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, pass: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (cred.user) {
      await updateProfile(cred.user, { displayName: name.trim() });
      const userRef = doc(db, 'users', cred.user.uid);
      await setDoc(userRef, {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: name.trim(),
        photoURL: null,
        currentFamilyId: null,
        familyIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }, []);

  const signInAsGuest = useCallback(async (guestName?: string) => {
    const cred = await signInAnonymously(auth);
    if (cred.user) {
      const name = guestName?.trim() || `Familiar Invitado`;
      await updateProfile(cred.user, { displayName: name });
      const userRef = doc(db, 'users', cred.user.uid);
      await setDoc(userRef, {
        uid: cred.user.uid,
        email: null,
        displayName: name,
        photoURL: null,
        currentFamilyId: null,
        familyIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setCurrentFamilyId(null);
    setActiveFamily(null);
    setUserProfile(null);
  }, []);

  const switchFamily = useCallback(
    async (familyId: string) => {
      if (!user) return;
      // Multi-family isolation guard: verify that user actually belongs to this family
      if (userProfile?.familyIds && !userProfile.familyIds.includes(familyId)) {
        console.warn(`[Security Alert] Intento no autorizado de cambiar a la familia ${familyId}. El usuario no es miembro.`);
        return;
      }
      setCurrentFamilyId(familyId);
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        currentFamilyId: familyId,
        updatedAt: new Date().toISOString(),
      });
    },
    [user, userProfile?.familyIds]
  );

  const userParentCheck = useCallback(
    (target?: string | FamilyWorkspace | null): ParentPermissionCheck => {
      let fam: FamilyWorkspace | null = activeFamily;
      if (target && typeof target !== 'string') {
        fam = target;
      }
      return checkParentPermission(user, fam);
    },
    [user, activeFamily]
  );

  const canCreateInvite = useMemo(() => {
    return checkParentPermission(user, activeFamily).isParent;
  }, [user, activeFamily]);

  const createFamily = useCallback(
    async (name: string, withDemoData: boolean = false, currencyCode: string = 'USD', currencySymbol: string = '$'): Promise<string> => {
      if (!user) throw new Error('Debes iniciar sesión para crear un espacio familiar');

      const familyId = `fam_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const creatorName = user.displayName || user.email?.split('@')[0] || 'Miembro Principal';

      // Always create a fresh clean slate without any demo data; categories with budgetLimit: 0
      const cleanCategories = initialFamilyState.categories.map(c => ({
        ...c,
        budgetLimit: 0,
      }));

      const initialState: FamilyState = {
        familyName: name.trim(),
        familyCode: '',
        currency: currencySymbol,
        currencyCode: currencyCode,
        members: [
          {
            id: `mem-${user.uid.slice(0, 8)}`,
            uid: user.uid,
            name: creatorName,
            role: 'Padre / Esposo',
            avatar: '👨‍💼',
            color: '#4F46E5',
            monthlyIncome: 0,
            email: user.email || undefined,
          },
        ],
        categories: cleanCategories,
        tags: initialFamilyState.tags,
        transactions: [],
        bankAccounts: [],
        savingsGoals: [],
        recurringExpenses: [],
        childAllowances: [],
        globalMonthlyBudget: 0,
        globalAlertThreshold: 85,
        isEncryptionEnabled: false,
        updatedAt: Date.now(),
      };

      const familyDocData: FamilyWorkspace = {
        id: familyId,
        familyName: name.trim(),
        ownerId: user.uid,
        parentUids: [user.uid],
        memberUids: [user.uid],
        state: initialState,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save family in Firestore
      await setDoc(doc(db, 'families', familyId), sanitizeForFirestore(familyDocData));

      // Update user doc with new family
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        currentFamilyId: familyId,
        familyIds: arrayUnion(familyId),
        updatedAt: new Date().toISOString(),
      });

      setCurrentFamilyId(familyId);
      setActiveFamily(familyDocData);
      return familyId;
    },
    [user]
  );

  /**
   * Generates a 256-bit cryptographically secure invitation token.
   * STRICT ENFORCEMENT:
   * 1. Only users with role "Padre" or "Madre" (or family creator/owner) can create invites.
   * 2. Exactly 60 minutes expiration.
   * 3. Single-use: revoked immediately upon redemption.
   * 4. Ephemeral: never stored as a static code on the family workspace.
   */
  const createInvite = useCallback(async (targetFamilyId?: string): Promise<{
    success: boolean;
    invite?: FamilyInvite;
    token?: string;
    expiresAt?: number;
    formattedExpiry?: string;
    message?: string;
  }> => {
    if (!user) {
      return { success: false, message: 'Debes iniciar sesión para generar una invitación.' };
    }
    if (!activeFamily) {
      return { success: false, message: 'No hay un hogar familiar activo seleccionado.' };
    }

    const targetId = (targetFamilyId || activeFamily.id || '').trim();
    if (!targetId || targetId !== activeFamily.id) {
      return {
        success: false,
        message: 'Por seguridad, solo puedes generar invitaciones para tu hogar activo.',
      };
    }

    const isFamilyMember =
      activeFamily.ownerId === user.uid ||
      (Array.isArray(activeFamily.memberUids) && activeFamily.memberUids.includes(user.uid));
    if (!isFamilyMember) {
      return {
        success: false,
        message: 'Acceso restringido: no perteneces al hogar familiar activo.',
      };
    }

    const { isParent, roleName, reason } = checkParentPermission(user, activeFamily);
    if (!isParent) {
      return {
        success: false,
        message:
          reason ||
          'Acceso restringido: Solo los miembros con rol de Padre o Madre pueden generar invitaciones para este hogar.',
      };
    }

    try {
      const token = generate256BitInviteToken();
      const now = Date.now();
      const expiresAt = now + 60 * 60 * 1000; // 60 minutos

      const newInvite: FamilyInvite = {
        token,
        familyId: targetId,
        familyName: activeFamily.familyName,
        creatorUid: user.uid,
        creatorName: user.displayName || user.email?.split('@')[0] || 'Padre/Madre',
        creatorRole: roleName,
        createdAt: now,
        expiresAt,
        used: false,
        status: 'active',
      };

      await setDoc(doc(db, 'invites', token), newInvite);

      return {
        success: true,
        invite: newInvite,
        token,
        expiresAt,
        formattedExpiry: '60 minutos',
        message: 'Invitación segura de 256-bit generada (válida por 60 minutos).',
      };
    } catch (err: any) {
      console.error('Error creating 256-bit invite:', err);
      return { success: false, message: err.message || 'Error al generar la invitación familiar.' };
    }
  }, [user, activeFamily]);

  /**
   * Revokes an active invitation immediately so it can never be used.
   */
  const revokeInvite = useCallback(
    async (token: string): Promise<{ success: boolean; message: string }> => {
      if (!user) return { success: false, message: 'Debes iniciar sesión.' };
      try {
        const inviteRef = doc(db, 'invites', token);
        await updateDoc(inviteRef, {
          status: 'revoked',
          used: true,
          revokedAt: new Date().toISOString(),
        });
        return { success: true, message: 'La invitación ha sido revocada y ya no podrá ser utilizada.' };
      } catch (err: any) {
        console.error('Error revoking invite:', err);
        return { success: false, message: err.message || 'Error al revocar la invitación.' };
      }
    },
    [user]
  );

  const joinFamilyByCode = useCallback(
    async (codeOrToken: string): Promise<{ success: boolean; message: string }> => {
      if (!user) return { success: false, message: 'Debes iniciar sesión primero para unirte a un hogar.' };

      const cleanToken = sanitizeInviteToken(codeOrToken);
      if (!cleanToken) {
        return { success: false, message: 'Introduce un token o enlace de invitación válido.' };
      }

      try {
        const memberName = user.displayName || user.email?.split('@')[0] || 'Nuevo Familiar';

        const resultData = await runTransaction(db, async (transaction) => {
          const inviteRef = doc(db, 'invites', cleanToken);
          const inviteSnap = await transaction.get(inviteRef);

          if (!inviteSnap.exists()) {
            throw new Error(
              'No se encontró ninguna invitación activa o válida. Verifica el token o solicita una nueva invitación de 256 bits a un padre o madre.'
            );
          }

          const invData = inviteSnap.data() as FamilyInvite;
          if (!invData.familyId) {
            throw new Error('La invitación no está asociada a un hogar válido.');
          }

          if (invData.expiresAt && Date.now() > invData.expiresAt) {
            throw new Error(
              'Esta invitación ha expirado (tenía una validez máxima de 60 minutos). Solicita una nueva invitación a un padre o madre del hogar.'
            );
          }

          if (invData.status === 'revoked') {
            throw new Error('Esta invitación fue revocada por el administrador familiar.');
          }

          if (invData.used || invData.status === 'used') {
            throw new Error('Esta invitación ya ha sido utilizada (era de un solo uso). Solicita una nueva invitación.');
          }

          if (invData.status !== 'active') {
            throw new Error('La invitación no se encuentra activa. Solicita una nueva invitación.');
          }

          const familyRef = doc(db, 'families', invData.familyId);
          const familySnap = await transaction.get(familyRef);
          if (!familySnap.exists()) {
            throw new Error('El hogar familiar asociado a esta invitación ya no existe.');
          }

          const familyData = familySnap.data() as FamilyWorkspace;
          const existingMemberUids = Array.isArray(familyData.memberUids) ? familyData.memberUids : [];
          const alreadyMember =
            familyData.ownerId === user.uid ||
            existingMemberUids.includes(user.uid);

          const existingMembers = familyData.state?.members || [];
          const hasMemberSlot = existingMembers.some(
            (m) =>
              m.id === `mem-${user.uid.slice(0, 8)}` ||
              (user.email && m.email?.toLowerCase() === user.email.toLowerCase())
          );

          const nowIso = new Date().toISOString();
          const familyUpdate: Record<string, unknown> = {
            memberUids: arrayUnion(user.uid),
            lastRedeemedToken: cleanToken,
            updatedAt: nowIso,
          };

          if (!hasMemberSlot) {
            const updatedMembers = [
              ...existingMembers,
              {
                id: `mem-${user.uid.slice(0, 8)}`,
                uid: user.uid,
                name: memberName,
                role: 'Hijo/a',
                avatar: '👤',
                color: '#0D9488',
                email: user.email || undefined,
              },
            ];
            familyUpdate['state.members'] = sanitizeForFirestore(updatedMembers);
          }

          transaction.update(familyRef, familyUpdate);
          transaction.update(inviteRef, {
            used: true,
            status: 'used',
            usedByUid: user.uid,
            usedByName: memberName,
            usedAt: nowIso,
          });

          const userRef = doc(db, 'users', user.uid);
          transaction.update(userRef, {
            currentFamilyId: invData.familyId,
            familyIds: arrayUnion(invData.familyId),
            updatedAt: nowIso,
          });

          return {
            familyId: invData.familyId,
            familyName: familyData.familyName || invData.familyName || 'Hogar Familiar',
            alreadyMember,
          };
        });

        setCurrentFamilyId(resultData.familyId);

        if (resultData.alreadyMember) {
          return {
            success: true,
            message: `Ya perteneces a "${resultData.familyName}". Espacio seleccionado.`,
          };
        }

        return {
          success: true,
          message: `¡Te has unido exitosamente al hogar familiar "${resultData.familyName}"!`,
        };
      } catch (err: any) {
        console.error('Error in joinFamilyByCode:', err);
        return { success: false, message: err.message || 'Error al unirse a la familia.' };
      }
    },
    [user]
  );

  const updateFamilyState = useCallback(
    async (payload: { state: FamilyState; stateEncrypted?: FamilyEncryptedState; encryptionMode?: 'strict' | 'compat' }) => {
      if (!currentFamilyId || !user) return;
      try {
        const familyRef = doc(db, 'families', currentFamilyId);
        const cleanState = sanitizeForFirestore(payload.state);
        const parentRoles = new Set(['padre / esposo', 'madre / esposa', 'padre', 'madre']);
        const computedParentUids = Array.from(
          new Set(
            (cleanState.members || [])
              .filter((m: any) => {
                const role = String(m?.role || '').toLowerCase();
                return parentRoles.has(role);
              })
              .map((m: any) => m?.uid)
              .filter((uid: any): uid is string => typeof uid === 'string' && uid.trim().length > 0)
          )
        );

        if (!computedParentUids.includes(user.uid)) {
          computedParentUids.push(user.uid);
        }

        if (activeFamily?.ownerId && !computedParentUids.includes(activeFamily.ownerId)) {
          computedParentUids.push(activeFamily.ownerId);
        }

        const isOwner = activeFamily?.ownerId === user.uid;
        const hasParentUidsBaseline = Array.isArray(activeFamily?.parentUids);
        const updatePayload: Record<string, unknown> = {
          state: cleanState,
          stateEncrypted: payload.stateEncrypted ?? null,
          encryptionMode: payload.encryptionMode || null,
          updatedAt: new Date().toISOString(),
        };

        if (isOwner || hasParentUidsBaseline) {
          updatePayload.parentUids = computedParentUids;
        }

        await updateDoc(familyRef, updatePayload);
      } catch (err) {
        console.error('Error updating family state in Firestore:', err);
      }
    },
    [currentFamilyId, user, activeFamily?.ownerId, activeFamily?.parentUids]
  );

  const deleteFamily = useCallback(
    async (familyId?: string): Promise<{ success: boolean; message: string }> => {
      if (!user) throw new Error('Debes iniciar sesión para realizar esta acción.');

      const targetId = familyId || currentFamilyId;
      if (!targetId) throw new Error('No hay ninguna unidad familiar seleccionada para borrar.');

      try {
        const familyRef = doc(db, 'families', targetId);
        const familySnap = await getDoc(familyRef);

        if (!familySnap.exists()) {
          throw new Error('La unidad familiar no existe o ya fue eliminada.');
        }

        const familyData = familySnap.data() as FamilyWorkspace;

        // Verify creator permission strictly
        if (familyData.ownerId !== user.uid) {
          throw new Error('Solo el creador de la unidad familiar tiene permisos para eliminarla.');
        }

        const deletedFamilyName = familyData.familyName || 'Unidad Familiar';

        // 1. Delete family document from Firestore
        await deleteDoc(familyRef);

        // DevSecOps: Also remove the invite directory record
        if (familyData.inviteCode) {
          try {
            await deleteDoc(doc(db, 'invites', familyData.inviteCode));
          } catch (_) {}
        }

        // 2. Remove familyId from current user's profile and choose next active family
        const userRef = doc(db, 'users', user.uid);
        const remainingFamilyIds = (userProfile?.familyIds || []).filter(id => id !== targetId);
        const nextFamilyId = remainingFamilyIds.length > 0 ? remainingFamilyIds[0] : null;

        await updateDoc(userRef, {
          familyIds: arrayRemove(targetId),
          currentFamilyId: nextFamilyId,
          updatedAt: new Date().toISOString(),
        });

        // 3. Update local state
        setUserFamilies(prev => prev.filter(f => f.id !== targetId));
        setCurrentFamilyId(nextFamilyId);

        if (!nextFamilyId) {
          setActiveFamily(null);
          try {
            localStorage.removeItem('family_finances_state_v1');
          } catch (_) {}
        }

        return {
          success: true,
          message: `La unidad familiar "${deletedFamilyName}" ha sido eliminada permanentemente.`,
        };
      } catch (err: any) {
        console.error('Error al borrar la unidad familiar:', err);
        throw err;
      }
    },
    [user, currentFamilyId, userProfile?.familyIds]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        userProfile,
        currentFamilyId,
        activeFamily,
        userFamilies,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInAsGuest,
        logout,
        logOut: logout,
        switchFamily,
        createFamily,
        createInvite,
        revokeInvite,
        joinFamilyByCode,
        updateFamilyState,
        deleteFamily,
        canCreateInvite,
        userParentCheck,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
