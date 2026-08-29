import { View } from 'react-native';
import { Skeleton } from 'heroui-native';

interface AudioPostSkeletonProps {
  count?: number;
}

function Row() {
  return (
    <View className="bg-surface border-border rounded-3xl border p-3.5">
      <View className="flex-row gap-3.5">
        <Skeleton className="h-[76px] w-[76px] rounded-[20px]" />
        <View className="flex-1 gap-2">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-4 w-full rounded-full" />
          <Skeleton className="h-4 w-2/3 rounded-full" />
          <Skeleton className="mt-1 h-6 w-full rounded-lg" />
        </View>
      </View>
      <View className="mt-3 flex-row gap-3">
        <Skeleton className="h-3 w-12 rounded-full" />
        <Skeleton className="h-3 w-12 rounded-full" />
        <Skeleton className="h-3 w-12 rounded-full" />
      </View>
    </View>
  );
}

/** Loading placeholder shown while feed or profile audio is being fetched. */
export function AudioPostSkeleton({ count = 4 }: AudioPostSkeletonProps) {
  return (
    <View className="gap-3">
      {Array.from({ length: count }, (_, index) => (
        <Row key={`skeleton-${index}`} />
      ))}
    </View>
  );
}
