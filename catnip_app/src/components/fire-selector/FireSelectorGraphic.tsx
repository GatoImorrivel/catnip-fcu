import type { FC } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { fitGraphicInSquare } from '@/components/fire-selector/fire-selector-graphic-utils';
import { useTheme } from '@/hooks/use-theme';
import { getFireSelectorPivot } from '@/replicas/fire-selector-pivot';
import { rnTransformAroundPivot } from '@/replicas/fire-selector-pivot-math';
import type { ReplicaType } from '@/replicas/types';

import M4FireSelector from '../../../assets/m4_style/fire_selector.svg';
import AkFireSelector from '../../../assets/ak_style/fire_selector.svg';

const SELECTOR_SVG: Record<ReplicaType, FC<SvgProps>> = {
  M4: M4FireSelector,
  AK: AkFireSelector,
};

const M4_ASPECT = 512 / 1024;
const AK_ASPECT = 176.67398 / 52.871712;

type FireSelectorGraphicProps = {
  replicaType: ReplicaType;
  rotationDeg: number;
  /** Max width and height of the layout box (graphic fits inside after rotation). */
  size?: number;
  /** Override stroke color (defaults to theme foreground). */
  strokeColor?: string;
  style?: ViewStyle;
};

export function FireSelectorGraphic({
  replicaType,
  rotationDeg,
  size = 120,
  strokeColor: strokeColorProp,
  style,
}: FireSelectorGraphicProps) {
  const { theme } = useTheme();
  const strokeColor = strokeColorProp ?? theme.colors.foreground;
  const SvgComponent = SELECTOR_SVG[replicaType];
  const aspect = replicaType === 'M4' ? M4_ASPECT : AK_ASPECT;
  const pivot = getFireSelectorPivot(replicaType);
  const { graphicWidth, graphicHeight, containerWidth, containerHeight } = fitGraphicInSquare(
    aspect,
    rotationDeg,
    size,
    pivot,
  );

  return (
    <View
      style={[
        styles.container,
        {
          width: containerWidth,
          height: containerHeight,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.rotated,
          {
            width: graphicWidth,
            height: graphicHeight,
            transform: rnTransformAroundPivot(
              rotationDeg,
              pivot,
              graphicWidth,
              graphicHeight,
            ),
          },
        ]}
      >
        <SvgComponent
          width={graphicWidth}
          height={graphicHeight}
          color={strokeColor}
          stroke={strokeColor}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotated: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
