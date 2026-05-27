import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfirmModal, ProfileAssignmentRow } from '@/components/fcu-profiles';
import { LiveFireSelectorPanel } from '@/components/fire-selector/LiveFireSelectorPanel';
import {
  getProfileDisplayName,
  listProfiles,
  parseSelectorPositionProfiles,
  profileIdForPosition,
  upsertPositionProfileAssignment,
  type FcuProfileId,
  type SelectorPositionProfileAssignment,
} from '@/fcu-profiles';
import { useFcuProfiles } from '@/hooks/use-fcu-profiles';
import { useProfileFcuSync } from '@/hooks/use-profile-fcu-sync';
import { useReplicas } from '@/hooks/use-replicas';
import { useTheme } from '@/hooks/use-theme';
import {
  assertReplicaType,
  parseSelectorPositionMapping,
  type ReplicaType,
  type SelectorPositionMappingEntry,
} from '@/replicas';
import { Screen } from '@/screens/components';

const LAYOUT_MARGIN = 8;
const HEADER_HEIGHT_FALLBACK = 48;
const PROFILE_BLOCK_HEIGHT_FALLBACK = 160;

export function ReplicaDetailScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const replicaId = typeof id === 'string' ? id : '';
  const { get, update } = useReplicas();

  const [replicaName, setReplicaName] = useState('');
  const [peripheralId, setPeripheralId] = useState<string | null>(null);
  const [replicaType, setReplicaType] = useState<ReplicaType | null>(null);
  const [selectorPositionMapping, setSelectorPositionMapping] = useState<
    SelectorPositionMappingEntry[]
  >([]);
  const [positionAssignments, setPositionAssignments] = useState<
    SelectorPositionProfileAssignment[]
  >([]);
  const [replicaError, setReplicaError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetProfileId, setDeleteTargetProfileId] = useState<FcuProfileId | null>(null);
  const [deletingProfile, setDeletingProfile] = useState(false);
  const [deleteProfileError, setDeleteProfileError] = useState<string | null>(null);
  const [activeFcuPosition, setActiveFcuPosition] = useState<number | null>(null);
  const [selectorReady, setSelectorReady] = useState(false);
  const [selectorUnmapped, setSelectorUnmapped] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [selectorBlockHeight, setSelectorBlockHeight] = useState(0);
  const [profileBlockHeight, setProfileBlockHeight] = useState(0);

  const fcuProfiles = useFcuProfiles(peripheralId);
  const {
    syncError,
    clearSyncError,
    pushProfileAtPosition,
    pushAssignmentForPosition,
  } = useProfileFcuSync(peripheralId);

  const positionAssignmentsRef = useRef(positionAssignments);
  positionAssignmentsRef.current = positionAssignments;

  const persistAssignments = useCallback(
    async (assignments: SelectorPositionProfileAssignment[]) => {
      if (!replicaId) {
        return;
      }
      try {
        await update(replicaId, { selectorPositionProfiles: assignments });
      } catch {
        // UI-only phase: keep local state if persistence fails
      }
    },
    [replicaId, update],
  );

  useFocusEffect(
    useCallback(() => {
      if (!replicaId) {
        setReplicaError('Missing replica id');
        setPeripheralId(null);
        return;
      }

      let cancelled = false;

      void get(replicaId)
        .then((replica) => {
          if (cancelled) {
            return;
          }
          if (!replica) {
            setReplicaError('Replica not found');
            setPeripheralId(null);
            setReplicaType(null);
            return;
          }
          setReplicaName(replica.name);
          setPeripheralId(replica.bluetoothMac);
          setReplicaType(assertReplicaType(replica.type));
          setSelectorPositionMapping(parseSelectorPositionMapping(replica));
          setPositionAssignments(parseSelectorPositionProfiles(replica));
          setReplicaError(null);
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setReplicaError(err instanceof Error ? err.message : String(err));
            setPeripheralId(null);
            setReplicaType(null);
          }
        });

      return () => {
        cancelled = true;
      };
    }, [get, replicaId]),
  );

  const hasMapping = selectorPositionMapping.length > 0;

  const profileVisible =
    selectorReady && !selectorUnmapped && activeFcuPosition !== null;

  const measuredHeaderHeight = headerHeight > 0 ? headerHeight : HEADER_HEIGHT_FALLBACK;
  const profileReserve = profileVisible
    ? (profileBlockHeight > 0 ? profileBlockHeight : PROFILE_BLOCK_HEIGHT_FALLBACK) +
      LAYOUT_MARGIN
    : LAYOUT_MARGIN;
  const availableTop = measuredHeaderHeight + LAYOUT_MARGIN;
  const availableBottom = Math.max(availableTop, canvasHeight - profileReserve);
  const availableHeight = availableBottom - availableTop;
  const selectorCenterY =
    canvasHeight > 0 && availableHeight > 0
      ? availableTop + availableHeight / 2
      : canvasHeight > 0
        ? canvasHeight / 2
        : null;

  const profileIdForActivePosition = useCallback(
    (fcuPosition: number) => {
      return (
        profileIdForPosition(positionAssignments, fcuPosition) ??
        fcuProfiles.profiles[0]?.id ??
        null
      );
    },
    [fcuProfiles.profiles, positionAssignments],
  );

  const assignProfileToPosition = useCallback(
    (fcuPosition: number, profileId: FcuProfileId) => {
      clearSyncError();
      setPositionAssignments((prev) => {
        const next = upsertPositionProfileAssignment(prev, fcuPosition, profileId);
        void persistAssignments(next);
        void pushProfileAtPosition(fcuPosition, profileId);
        return next;
      });
    },
    [clearSyncError, persistAssignments, pushProfileAtPosition],
  );

  const handlePositionContextChange = useCallback(
    ({
      fcuPosition,
      isUnmapped,
      ready,
    }: {
      fcuPosition: number | null;
      isUnmapped: boolean;
      ready: boolean;
    }) => {
      setActiveFcuPosition(fcuPosition);
      setSelectorUnmapped(isUnmapped);
      setSelectorReady(ready);

      if (ready && !isUnmapped && fcuPosition !== null) {
        void pushAssignmentForPosition(fcuPosition, positionAssignmentsRef.current);
      }
    },
    [pushAssignmentForPosition],
  );

  const handleSelectProfile = useCallback(
    (profileId: FcuProfileId) => {
      if (activeFcuPosition === null) {
        return;
      }
      assignProfileToPosition(activeFcuPosition, profileId);
    },
    [activeFcuPosition, assignProfileToPosition],
  );

  const handleRequestNewProfile = useCallback(() => {
    if (activeFcuPosition === null || !replicaId) {
      return;
    }
    router.push({
      pathname: '/replicas/[id]/new-profile',
      params: {
        id: replicaId,
        fcuPosition: String(activeFcuPosition),
      },
    });
  }, [activeFcuPosition, replicaId, router]);

  const handlePressEditProfile = useCallback(() => {
    if (activeFcuPosition === null || !replicaId) {
      return;
    }

    const profileId = profileIdForActivePosition(activeFcuPosition);
    const profile = fcuProfiles.getProfileById(profileId);
    if (!profile || profile.isDefault) {
      return;
    }

    router.push({
      pathname: '/replicas/[id]/edit-profile',
      params: {
        id: replicaId,
        profileId,
        fcuPosition: String(activeFcuPosition),
      },
    });
  }, [activeFcuPosition, fcuProfiles, profileIdForActivePosition, replicaId, router]);

  const selectorBottomY =
    selectorCenterY !== null && selectorBlockHeight > 0
      ? selectorCenterY + selectorBlockHeight / 2
      : null;
  const profileMidpointY =
    canvasHeight > 0 && selectorBottomY !== null
      ? (selectorBottomY + canvasHeight) / 2
      : null;

  const exitToReplicasList = useCallback(() => {
    router.replace('/');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        exitToReplicasList();
        return true;
      });
      return () => subscription.remove();
    }, [exitToReplicasList]),
  );

  useFocusEffect(
    useCallback(() => {
      if (
        activeFcuPosition === null ||
        !selectorReady ||
        selectorUnmapped ||
        !peripheralId
      ) {
        return;
      }
      void pushAssignmentForPosition(
        activeFcuPosition,
        positionAssignmentsRef.current,
      );
    }, [
      activeFcuPosition,
      peripheralId,
      pushAssignmentForPosition,
      selectorReady,
      selectorUnmapped,
    ]),
  );

  const deleteTargetProfile = deleteTargetProfileId
    ? fcuProfiles.getProfileById(deleteTargetProfileId)
    : undefined;

  const handleRequestDeleteProfile = useCallback(() => {
    if (activeFcuPosition === null) {
      return;
    }

    const profileId = profileIdForActivePosition(activeFcuPosition);
    const profile = fcuProfiles.getProfileById(profileId);
    if (!profile || profile.isDefault) {
      return;
    }

    setDeleteProfileError(null);
    setDeleteTargetProfileId(profileId);
    setDeleteConfirmOpen(true);
  }, [activeFcuPosition, fcuProfiles, profileIdForActivePosition]);

  const handleCancelDeleteProfile = useCallback(() => {
    if (deletingProfile) {
      return;
    }
    setDeleteConfirmOpen(false);
    setDeleteTargetProfileId(null);
  }, [deletingProfile]);

  const handleConfirmDeleteProfile = useCallback(async () => {
    if (activeFcuPosition === null || !peripheralId || !deleteTargetProfileId) {
      return;
    }

    const profile = fcuProfiles.getProfileById(deleteTargetProfileId);
    if (!profile || profile.isDefault) {
      setDeleteConfirmOpen(false);
      setDeleteTargetProfileId(null);
      return;
    }

    setDeletingProfile(true);
    setDeleteProfileError(null);
    clearSyncError();

    try {
      fcuProfiles.deleteCustomProfile(deleteTargetProfileId);
      const fallback =
        listProfiles(peripheralId).find((entry) => entry.isDefault) ??
        listProfiles(peripheralId)[0];

      const withoutDeleted = positionAssignmentsRef.current.filter(
        (entry) => entry.profileId !== deleteTargetProfileId,
      );
      const next =
        fallback !== undefined
          ? upsertPositionProfileAssignment(
              withoutDeleted,
              activeFcuPosition,
              fallback.id,
            )
          : withoutDeleted;

      setPositionAssignments(next);
      await persistAssignments(next);

      if (fallback !== undefined) {
        await pushProfileAtPosition(activeFcuPosition, fallback.id);
      }

      setDeleteConfirmOpen(false);
      setDeleteTargetProfileId(null);
    } catch (err: unknown) {
      setDeleteProfileError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeletingProfile(false);
    }
  }, [
    activeFcuPosition,
    clearSyncError,
    deleteTargetProfileId,
    fcuProfiles,
    peripheralId,
    persistAssignments,
    pushProfileAtPosition,
  ]);

  return (
    <Screen style={styles.screen}>
      <View
        style={styles.canvas}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setCanvasWidth(width);
          setCanvasHeight(height);
        }}
      >
        <View
          style={styles.header}
          onLayout={(event) => {
            setHeaderHeight(event.nativeEvent.layout.height);
          }}
        >
          <Pressable
            onPress={exitToReplicasList}
            accessibilityRole="button"
            accessibilityLabel="Back to replicas"
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <MaterialIcons name="arrow-back" size={24} color={theme.colors.foreground} />
          </Pressable>
          <Text
            style={[styles.title, { color: theme.colors.foreground }]}
            numberOfLines={1}
          >
            {replicaName || 'Replica'}
          </Text>
        </View>

        {replicaError ? (
          <Text style={[styles.error, { color: theme.colors.primary }]}>{replicaError}</Text>
        ) : null}

        {hasMapping && replicaType && peripheralId ? (
          <>
            <View
              style={[
                styles.selectorOverlay,
                selectorCenterY !== null && { top: selectorCenterY },
              ]}
              pointerEvents="box-none"
            >
              <View
                onLayout={(event) => {
                  setSelectorBlockHeight(event.nativeEvent.layout.height);
                }}
              >
                <LiveFireSelectorPanel
                  replicaType={replicaType}
                  peripheralId={peripheralId}
                  mapping={selectorPositionMapping}
                  maxGraphicWidth={canvasWidth > 0 ? canvasWidth : undefined}
                  maxGraphicHeight={availableHeight > 0 ? availableHeight : undefined}
                  captionMode="fireMode"
                  fetchFireModeLabel={false}
                  layout="compact"
                  onPositionContextChange={handlePositionContextChange}
                />
              </View>
            </View>
            {profileVisible && profileMidpointY !== null ? (
              <View
                style={[styles.profileOverlay, { top: profileMidpointY }]}
                pointerEvents="box-none"
                onLayout={(event) => {
                  setProfileBlockHeight(event.nativeEvent.layout.height);
                }}
              >
                <ProfileAssignmentRow
                  profiles={fcuProfiles.profiles}
                  selectedProfileId={profileIdForActivePosition(activeFcuPosition)}
                  onSelectProfile={handleSelectProfile}
                  onRequestNewProfile={handleRequestNewProfile}
                  onPressEdit={handlePressEditProfile}
                  onPressDelete={handleRequestDeleteProfile}
                  deleting={deletingProfile}
                />
                {syncError ? (
                  <Text style={[styles.deleteError, { color: theme.colors.primary }]}>
                    {syncError}
                  </Text>
                ) : null}
                {deleteProfileError ? (
                  <Text style={[styles.deleteError, { color: theme.colors.primary }]}>
                    {deleteProfileError}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.emptyMapping}>
            <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>
              Fire selector mapping is not configured
            </Text>
            <Text style={[styles.emptyHint, { color: theme.colors.muted }]}>
              Map each switch position to your FCU so the selector graphic can follow your
              replica in real time.
            </Text>
            {replicaId ? (
              <Pressable
                onPress={() => router.push(`/replicas/${replicaId}/map-selector`)}
                style={({ pressed }) => [
                  styles.configureButton,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.configureButtonLabel,
                    { color: theme.colors.primaryForeground },
                  ]}
                >
                  Configure mapping
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>

      <ConfirmModal
        visible={deleteConfirmOpen}
        title="Delete profile?"
        message={
          deleteTargetProfile
            ? `Delete "${getProfileDisplayName(deleteTargetProfile)}"? This cannot be undone.`
            : 'Delete this profile? This cannot be undone.'
        }
        confirmLabel="Delete"
        confirming={deletingProfile}
        onConfirm={handleConfirmDeleteProfile}
        onCancel={handleCancelDeleteProfile}
      />

    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: 0,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 20,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  pressed: {
    opacity: 0.6,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
  },
  canvas: {
    flex: 1,
    position: 'relative',
    minHeight: 240,
  },
  error: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    fontSize: 14,
    zIndex: 30,
  },
  selectorOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    transform: [{ translateY: '-50%' }],
    zIndex: 5,
  },
  profileOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    transform: [{ translateY: '-50%' }],
    zIndex: 10,
    gap: 8,
  },
  deleteError: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  emptyMapping: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  configureButton: {
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  configureButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
