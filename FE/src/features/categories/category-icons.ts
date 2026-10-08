import type { ComponentProps } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

const iconMap: Record<string, MaterialIconName> = {
  work: 'work',
  laptop: 'laptop',
  storefront: 'storefront',
  'trending-up': 'trending-up',
  'card-giftcard': 'card-giftcard',
  'more-horiz': 'more-horiz',
  'briefcase-business': 'business-center',
  gift: 'card-giftcard',
  'chart-no-axes-combined': 'bar-chart',
  'circle-plus': 'add-circle',
  banknote: 'payments',
  'receipt-text': 'receipt-long',
  'graduation-cap': 'school',
  clapperboard: 'movie',
  utensils: 'restaurant',
  'heart-pulse': 'favorite',
  'circle-ellipsis': 'more-horiz',
  plane: 'flight',
};

export function materialCategoryIcon(name: string | null | undefined): MaterialIconName {
  return iconMap[name ?? ''] ?? 'category';
}
