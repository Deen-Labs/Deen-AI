import { useWindowDimensions, ViewStyle } from 'react-native';

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 600;
  const isLargeTablet = width >= 900;

  const contentContainerStyle: ViewStyle = isTablet
    ? {
        maxWidth: isLargeTablet ? 980 : 760,
        width: '100%',
        alignSelf: 'center',
        paddingHorizontal: isLargeTablet ? 12 : 4,
      }
    : { width: '100%' };

  // Keeps 3-column prayer tables & focus controls compact and centered inside wide tablet cards
  const tableMaxWidthStyle: ViewStyle = isTablet
    ? { maxWidth: 600, width: '100%', alignSelf: 'center' }
    : { width: '100%' };

  const modalMaxWidthStyle: ViewStyle = isTablet
    ? { maxWidth: 560, width: '100%', alignSelf: 'center' }
    : { width: '100%' };

  const gridColumns = isLargeTablet ? 4 : isTablet ? 3 : 2;

  return {
    width,
    height,
    isTablet,
    isLargeTablet,
    contentContainerStyle,
    tableMaxWidthStyle,
    modalMaxWidthStyle,
    gridColumns,
  };
}
