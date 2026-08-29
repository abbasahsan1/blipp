import { useWindowDimensions, View } from 'react-native';
import { Skeleton, Spinner, Typography } from 'heroui-native';

interface ReelSkeletonProps {
  /** Height of the feed viewport so the placeholder fills one full page. */
  height: number;
  topInset: number;
  bottomInset: number;
}

/** Full-screen loading placeholder for the autoplay feed. */
export function ReelSkeleton({ height, topInset, bottomInset }: ReelSkeletonProps) {
  const { width } = useWindowDimensions();
  const coverSize = Math.max(150, Math.min(width - 130, Math.round(height * 0.36)));

  return (
    <View style={{ height }} className="bg-background">
      <View className="flex-1 items-center justify-center" style={{ paddingTop: topInset }}>
        <Skeleton style={{ width: coverSize, height: coverSize, borderRadius: 28 }} />
        <View className="mt-6 flex-row items-center gap-2">
          <Spinner size="sm" />
          <Typography type="body-xs" color="muted">
            Loading audio
          </Typography>
        </View>
      </View>

      <View className="px-5" style={{ paddingBottom: bottomInset + 14 }}>
        <View className="flex-row items-end gap-3">
          <View className="flex-1 gap-2">
            <Skeleton className="h-4 w-32 rounded-full" />
            <Skeleton className="h-5 w-full rounded-full" />
            <Skeleton className="h-4 w-2/3 rounded-full" />
          </View>
          <View className="w-14 items-center gap-4">
            <Skeleton className="h-11 w-11 rounded-full" />
            <Skeleton className="h-11 w-11 rounded-full" />
            <Skeleton className="h-11 w-11 rounded-full" />
          </View>
        </View>
        <Skeleton className="mt-5 h-1 w-full rounded-full" />
      </View>
    </View>
  );
}
