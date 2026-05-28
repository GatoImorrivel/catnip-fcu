import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmModal } from '@/components/fcu-profiles';
import { useReplicas } from '@/hooks/use-replicas';
import { useTheme } from '@/hooks/use-theme';
import type { ReplicaSummary } from '@/replicas';
import { Screen } from '@/screens/components';

function getBoundFcuLabel(replica: ReplicaSummary): string {
  return replica.fcuName?.trim() || 'Unknown FCU';
}

export function ReplicasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, colorScheme, toggleColorScheme } = useTheme();
  const { replicas, loading, error, refresh, remove } = useReplicas();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const selectionMode = selectedIds.size > 0;
  const nextScheme = colorScheme === 'dark' ? 'light' : 'dark';

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setDeleteError(null);
  }, []);

  const selectReplica = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setDeleteError(null);
  }, []);

  const toggleReplica = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setDeleteError(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const handleRequestDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) {
      return;
    }
    setDeleteError(null);
    setDeleteConfirmOpen(true);
  }, [selectedIds.size]);

  const handleConfirmDeleteSelected = useCallback(async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) {
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    const failed: string[] = [];
    for (const id of ids) {
      try {
        await remove(id);
      } catch {
        failed.push(id);
      }
    }

    if (failed.length === 0) {
      clearSelection();
      setDeleteConfirmOpen(false);
    } else {
      setDeleteError(
        failed.length === ids.length
          ? 'Failed to delete selected replicas'
          : `Deleted ${ids.length - failed.length} of ${ids.length} replicas`,
      );
      setSelectedIds(new Set(failed));
    }

    setDeleting(false);
  }, [clearSelection, remove, selectedIds]);

  const renderReplicaItem = useCallback(
    ({ item }: { item: ReplicaSummary }) => {
      const selected = selectedIds.has(item.id);

      return (
        <Pressable
          onLongPress={() => selectReplica(item.id)}
          onPress={() => {
            if (selectionMode) {
              toggleReplica(item.id);
              return;
            }
            router.push({ pathname: '/replicas/[id]', params: { id: item.id } });
          }}
          delayLongPress={400}
          accessibilityRole="button"
          accessibilityLabel={`${item.name}, ${getBoundFcuLabel(item)}`}
          accessibilityState={{ selected }}
          style={({ pressed }) => [
            styles.replicaRow,
            {
              borderColor: selected ? theme.colors.primary : theme.colors.border,
              backgroundColor: selected
                ? theme.colors.primary
                : theme.colors.background,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <View style={styles.replicaText}>
            <Text
              style={[
                styles.replicaName,
                {
                  color: selected
                    ? theme.colors.primaryForeground
                    : theme.colors.foreground,
                },
              ]}
            >
              {item.name}
            </Text>
            <Text
              style={[
                styles.fcuName,
                {
                  color: selected ? theme.colors.primaryForeground : theme.colors.muted,
                  opacity: selected ? 0.85 : 1,
                },
              ]}
            >
              {getBoundFcuLabel(item)}
            </Text>
          </View>
          {selectionMode ? (
            <MaterialIcons
              name={selected ? 'check-circle' : 'radio-button-unchecked'}
              size={22}
              color={
                selected ? theme.colors.primaryForeground : theme.colors.muted
              }
            />
          ) : null}
        </Pressable>
      );
    },
    [
      router,
      selectReplica,
      selectedIds,
      selectionMode,
      theme.colors.background,
      theme.colors.border,
      theme.colors.foreground,
      theme.colors.muted,
      theme.colors.primary,
      theme.colors.primaryForeground,
      toggleReplica,
    ],
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.foreground }]}>Replicas</Text>
        <View style={styles.headerSpacer} />
        <Pressable
          onPress={() => router.push('/replicas/select-fcu')}
          accessibilityRole="button"
          accessibilityLabel="Add replica"
          hitSlop={8}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
        >
          <MaterialIcons name="add" size={24} color={theme.colors.foreground} />
        </Pressable>
        <Pressable
          onPress={toggleColorScheme}
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${nextScheme} mode`}
          hitSlop={8}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
        >
          <MaterialIcons
            name={colorScheme === 'dark' ? 'light-mode' : 'dark-mode'}
            size={22}
            color={theme.colors.foreground}
          />
        </Pressable>
      </View>

      {error ? (
        <Text style={[styles.error, { color: theme.colors.error }]}>{error.message}</Text>
      ) : null}

      {deleteError ? (
        <Text style={[styles.error, { color: theme.colors.error }]}>{deleteError}</Text>
      ) : null}

      {loading && replicas.length === 0 ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={replicas}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={[
            replicas.length === 0 ? styles.emptyList : undefined,
            selectionMode ? styles.listWithFooter : undefined,
          ]}
          extraData={selectedIds}
          ListEmptyComponent={
            !loading ? (
              <Text style={[styles.empty, { color: theme.colors.muted }]}>
                No replicas yet. Tap + to add one.
              </Text>
            ) : null
          }
          renderItem={renderReplicaItem}
        />
      )}

      {selectionMode ? (
        <View
          style={[
            styles.deleteBar,
            {
              borderTopColor: theme.colors.border,
              backgroundColor: theme.colors.background,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <Pressable
            onPress={clearSelection}
            disabled={deleting}
            accessibilityRole="button"
            accessibilityLabel="Cancel selection"
            style={({ pressed }) => [styles.cancelButton, pressed && styles.iconButtonPressed]}
          >
            <Text style={[styles.cancelLabel, { color: theme.colors.foreground }]}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleRequestDeleteSelected}
            disabled={deleting}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${selectedIds.size} replica${selectedIds.size === 1 ? '' : 's'}`}
            style={({ pressed }) => [
              styles.deleteButton,
              {
                backgroundColor: theme.colors.destructive,
                opacity: pressed || deleting ? 0.6 : 1,
              },
            ]}
          >
            {deleting ? (
              <ActivityIndicator color={theme.colors.destructiveForeground} />
            ) : (
              <>
                <MaterialIcons
                  name="delete"
                  size={22}
                  color={theme.colors.destructiveForeground}
                />
                <Text
                  style={[styles.deleteLabel, { color: theme.colors.destructiveForeground }]}
                >
                  Delete {selectedIds.size === 1 ? 'replica' : `${selectedIds.size} replicas`}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      ) : null}

      <ConfirmModal
        visible={deleteConfirmOpen}
        title="Delete replicas?"
        message={`Delete ${selectedIds.size} replica${selectedIds.size === 1 ? '' : 's'}? This cannot be undone.`}
        confirmLabel="Delete"
        confirming={deleting}
        onConfirm={() => void handleConfirmDeleteSelected()}
        onCancel={() => {
          if (!deleting) {
            setDeleteConfirmOpen(false);
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  headerSpacer: {
    flex: 1,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  iconButtonPressed: {
    opacity: 0.6,
  },
  error: {
    fontSize: 14,
    marginBottom: 8,
  },
  loadingRow: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
  },
  listWithFooter: {
    paddingBottom: 8,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: {
    textAlign: 'center',
    fontSize: 15,
  },
  replicaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    gap: 12,
  },
  replicaText: {
    flex: 1,
    gap: 2,
  },
  replicaName: {
    fontSize: 16,
    fontWeight: '600',
  },
  fcuName: {
    fontSize: 14,
  },
  deleteBar: {
    marginHorizontal: -16,
    marginBottom: -16,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 14,
    minHeight: 48,
  },
  deleteLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
