/**
 * ApiSearchModal - Search and import courses from GolfAPI.io
 *
 * Modal component for searching external golf course API and
 * importing courses to local database.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import {
  Text,
  TextInput,
  Chip,
  Button,
  Icon,
} from 'react-native-paper';
import { GolfBallLoader, BottomSheet } from '@/components/common';
import { spacing, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import {
  useApiCourseSearch,
  useImportBasicCourse,
  useIsApiAvailable,
} from '@/hooks/useApiCourses';
import type { LegacyCourse, AustralianState } from '@/types/database.types';

// =====================================================
// TYPES
// =====================================================

interface ApiSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onCourseImported?: (course: LegacyCourse) => void;
}

// =====================================================
// CONSTANTS
// =====================================================

const AUSTRALIAN_STATES: { value: AustralianState; label: string }[] = [
  { value: 'VIC', label: 'VIC' },
  { value: 'NSW', label: 'NSW' },
  { value: 'QLD', label: 'QLD' },
  { value: 'SA', label: 'SA' },
  { value: 'WA', label: 'WA' },
  { value: 'TAS', label: 'TAS' },
  { value: 'NT', label: 'NT' },
  { value: 'ACT', label: 'ACT' },
];

const DEBOUNCE_MS = 300;

// =====================================================
// COMPONENT
// =====================================================

export function ApiSearchModal({
  visible,
  onClose,
  onCourseImported,
}: ApiSearchModalProps) {
  const colors = useThemeColors();
  const isApiAvailable = useIsApiAvailable();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedState, setSelectedState] = useState<
    AustralianState | undefined
  >();
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());

  // Debounce search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search query
  const {
    data: searchResult,
    isLoading,
    isFetching,
    error,
  } = useApiCourseSearch(debouncedQuery, selectedState, {
    searchApi: true,
    enabled: visible && (debouncedQuery.length >= 2 || !!selectedState),
  });

  // Import mutation
  const importMutation = useImportBasicCourse({
    onSuccess: (course) => {
      setImportingIds((prev) => {
        const next = new Set(prev);
        next.delete(course.api_id || '');
        return next;
      });
      onCourseImported?.(course);
    },
    onError: (error) => {
      console.error('Import failed:', error);
      // Reset importing state on error
      setImportingIds(new Set());
    },
  });

  // Handle state filter toggle
  const handleStateToggle = useCallback((state: AustralianState) => {
    setSelectedState((prev) => (prev === state ? undefined : state));
  }, []);

  // Handle import
  const handleImport = useCallback(
    async (course: Partial<LegacyCourse>) => {
      if (!course.api_id) return;

      setImportingIds((prev) => new Set(prev).add(course.api_id!));

      importMutation.mutate(course);
    },
    [importMutation]
  );

  // Reset on close
  const handleClose = useCallback(() => {
    setSearchQuery('');
    setDebouncedQuery('');
    setSelectedState(undefined);
    setImportingIds(new Set());
    onClose();
  }, [onClose]);

  // Combine results
  const results = useMemo(() => {
    if (!searchResult) return [];

    // Show cached courses first, then API results
    const cached = searchResult.cached || [];
    const apiResults = searchResult.apiResults || [];

    return [
      ...cached.map((c) => ({ ...c, _isCached: true })),
      ...apiResults.map((c) => ({ ...c, _isCached: false })),
    ];
  }, [searchResult]);

  // Check if course is being imported
  const isImporting = useCallback(
    (apiId: string) => importingIds.has(apiId),
    [importingIds]
  );

  // Render course item
  const renderCourseItem = useCallback(
    ({ item }: { item: Partial<LegacyCourse> & { _isCached?: boolean } }) => {
      const isCached = item._isCached ?? false;
      const apiId = item.api_id || '';
      const importing = isImporting(apiId);

      return (
        <View
          style={[styles.courseCard, { backgroundColor: colors.white }]}
        >
          <View style={styles.courseCardContent}>
            <View style={styles.courseInfo}>
              <View style={styles.courseNameRow}>
                <Text
                  variant="titleSmall"
                  style={[styles.courseName, { color: colors.gray900 }]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                {isCached && (
                  <View
                    style={[
                      styles.cachedBadge,
                      { backgroundColor: colors.successLight },
                    ]}
                  >
                    <Icon
                      source="check-circle"
                      size={14}
                      color={colors.success}
                    />
                    <Text style={[styles.cachedText, { color: colors.success }]}>
                      Saved
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.courseDetails}>
                {item.city && (
                  <Text
                    variant="bodySmall"
                    style={[styles.courseDetailText, { color: colors.gray600 }]}
                  >
                    {item.city}
                    {item.state ? `, ${item.state}` : ''}
                  </Text>
                )}
                {!item.city && item.state && (
                  <Text
                    variant="bodySmall"
                    style={[styles.courseDetailText, { color: colors.gray600 }]}
                  >
                    {item.state}
                  </Text>
                )}
              </View>

              {item.address && (
                <Text
                  variant="bodySmall"
                  style={[styles.addressText, { color: colors.gray500 }]}
                  numberOfLines={1}
                >
                  {item.address}
                </Text>
              )}
            </View>

            {!isCached && (
              <Button
                mode="contained"
                compact
                onPress={() => handleImport(item)}
                loading={importing}
                disabled={importing}
                style={[styles.importButton, { backgroundColor: colors.primary }]}
                labelStyle={[styles.importButtonLabel, { color: colors.white }]}
              >
                {importing ? 'Importing' : 'Import'}
              </Button>
            )}
          </View>
        </View>
      );
    },
    [colors, handleImport, isImporting]
  );

  // Render empty state
  const renderEmptyState = useCallback(() => {
    if (isLoading || isFetching) return null;

    if (debouncedQuery.length < 2 && !selectedState) {
      return (
        <View style={styles.emptyState}>
          <Icon source="magnify" size={48} color={colors.gray400} />
          <Text
            variant="bodyMedium"
            style={[styles.emptyText, { color: colors.gray600 }]}
          >
            Search for golf courses by name
          </Text>
          <Text
            variant="bodySmall"
            style={[styles.emptySubtext, { color: colors.gray500 }]}
          >
            Or filter by state to browse courses
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyState}>
          <Icon source="alert-circle-outline" size={48} color={colors.error} />
          <Text
            variant="bodyMedium"
            style={[styles.emptyText, { color: colors.gray600 }]}
          >
            Search failed
          </Text>
          <Text
            variant="bodySmall"
            style={[styles.emptySubtext, { color: colors.gray500 }]}
          >
            {error.message || 'Please try again'}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Icon source="golf" size={48} color={colors.gray400} />
        <Text
          variant="bodyMedium"
          style={[styles.emptyText, { color: colors.gray600 }]}
        >
          No courses found
        </Text>
        <Text
          variant="bodySmall"
          style={[styles.emptySubtext, { color: colors.gray500 }]}
        >
          Try a different search term or filter
        </Text>
      </View>
    );
  }, [colors, isLoading, isFetching, debouncedQuery, selectedState, error]);

  // API not available state
  if (!isApiAvailable) {
    return (
      <BottomSheet
        visible={visible}
        onClose={handleClose}
        height="full"
        title="Search Courses"
        showHandle={false}
        safeAreaTop
      >
        <View style={styles.unavailableState}>
          <Icon source="cloud-off-outline" size={64} color={colors.gray400} />
          <Text
            variant="titleMedium"
            style={[styles.unavailableTitle, { color: colors.gray700 }]}
          >
            API Not Configured
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.unavailableText, { color: colors.gray500 }]}
          >
            Course search API is not available. Please configure your GolfAPI.io
            credentials.
          </Text>
        </View>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      height="full"
      title="Search Courses"
      showHandle={false}
      safeAreaTop
      testID="api-search-modal"
    >
      {/* Search Input */}
      <View style={[styles.searchContainer, { backgroundColor: colors.white }]}>
        <TextInput
          mode="outlined"
          placeholder="Search by course name..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          left={<TextInput.Icon icon="magnify" />}
          right={
            searchQuery.length > 0 ? (
              <TextInput.Icon icon="close" onPress={() => setSearchQuery('')} />
            ) : undefined
          }
          style={[styles.searchInput, { backgroundColor: colors.white }]}
          outlineStyle={styles.searchInputOutline}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      {/* State Filter Chips */}
      <View
        style={[
          styles.filterContainer,
          { backgroundColor: colors.white, borderBottomColor: colors.gray200 },
        ]}
      >
        <Text
          variant="labelMedium"
          style={[styles.filterLabel, { color: colors.gray600 }]}
        >
          Filter by state:
        </Text>
        <FlatList
          horizontal
          data={AUSTRALIAN_STATES}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipContainer}
          renderItem={({ item }) => (
            <Chip
              selected={selectedState === item.value}
              onPress={() => handleStateToggle(item.value)}
              style={[
                styles.chip,
                { backgroundColor: colors.gray100 },
                selectedState === item.value && {
                  backgroundColor: colors.primaryLight,
                },
              ]}
              textStyle={[
                styles.chipText,
                { color: colors.gray700 },
                selectedState === item.value && {
                  color: colors.primary,
                  fontWeight: '600',
                },
              ]}
              showSelectedCheck={false}
            >
              {item.label}
            </Chip>
          )}
        />
      </View>

      {/* API Error Banner */}
      {searchResult?.apiError && (
        <View style={[styles.errorBanner, { backgroundColor: colors.warningLight }]}>
          <Icon source="alert" size={16} color={colors.warning} />
          <Text
            variant="bodySmall"
            style={[styles.errorBannerText, { color: colors.warning }]}
          >
            {searchResult.apiError}
          </Text>
        </View>
      )}

      {/* Loading Indicator */}
      {(isLoading || isFetching) && (
        <View style={styles.loadingContainer}>
          <GolfBallLoader size="sm" />
          <Text
            variant="bodySmall"
            style={[styles.loadingText, { color: colors.gray600 }]}
          >
            Searching courses...
          </Text>
        </View>
      )}

      {/* Results List */}
      <FlatList
        data={results}
        keyExtractor={(item) =>
          item.api_id || item.id || Math.random().toString()
        }
        renderItem={renderCourseItem}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
      />

      {/* Result Count */}
      {results.length > 0 && (
        <View
          style={[
            styles.resultCount,
            { backgroundColor: colors.white, borderTopColor: colors.gray200 },
          ]}
        >
          <Text
            variant="bodySmall"
            style={[styles.resultCountText, { color: colors.gray500 }]}
          >
            {results.length} course{results.length !== 1 ? 's' : ''} found
            {searchResult?.cachedTotal
              ? ` (${searchResult.cachedTotal} in database)`
              : ''}
          </Text>
        </View>
      )}
    </BottomSheet>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  searchInput: {},
  searchInputOutline: {
    borderRadius: borderRadius.md,
  },
  filterContainer: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  filterLabel: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  chipContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  chip: {
    marginRight: spacing.xs,
  },
  chipText: {
    fontSize: 12,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  errorBannerText: {
    flex: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  loadingText: {},
  list: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  courseCard: {
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  courseCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  courseInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  courseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  courseName: {
    fontWeight: '600',
    flex: 1,
  },
  cachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  cachedText: {
    fontSize: 10,
    fontWeight: '600',
  },
  courseDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  courseDetailText: {},
  addressText: {
    marginTop: spacing.xs,
    fontSize: 12,
  },
  importButton: {
    borderRadius: borderRadius.sm,
  },
  importButtonLabel: {
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  unavailableState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  unavailableTitle: {
    marginTop: spacing.lg,
    fontWeight: '600',
  },
  unavailableText: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  resultCount: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  resultCountText: {
    textAlign: 'center',
  },
});

export default ApiSearchModal;
