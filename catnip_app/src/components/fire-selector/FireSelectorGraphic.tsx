import type { FC } from 'react';
import { useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { fitGraphicAtRotation } from '@/components/fire-selector/fire-selector-graphic-utils';
import { useTheme } from '@/hooks/use-theme';
import { getFireSelectorPivot } from '@/replicas/fire-selector-pivot';
import {
  graphicOffsetForPivotRotation,
  pivotTransformInContainer,
  rnTransformAroundPivot,
} from '@/replicas/fire-selector-pivot-math';
import type { ReplicaType } from '@/replicas/types';

import M4FireSelector from '../../../assets/m4_style/fire_selector.svg';
import AkFireSelector from '../../../assets/ak_style/fire_selector.svg';

const SELECTOR_SVG: Record<ReplicaType, FC<SvgProps>> = {
  M4: M4FireSelector,
  AK: AkFireSelector,
};

export type FireSelectorRotationAnchor = 'viewportPivot' | 'svgCenter';

type FireSelectorGraphicProps = {
  replicaType: ReplicaType;
  rotationDeg: number;
  /** Max width and height of the layout box (graphic fits inside after rotation). */
  size?: number;
  /** Override stroke color (defaults to theme foreground). */
  strokeColor?: string;
  /**
   * `viewportPivot` — pivot stays at container center (live/animated panels).
   * `svgCenter` — graphic viewBox center is centered; rotation is about the replica pivot.
   */
  rotationAnchor?: FireSelectorRotationAnchor;
  style?: ViewStyle;
};

export function FireSelectorGraphic({
  replicaType,
  rotationDeg,
  size = 120,
  strokeColor: strokeColorProp,
  rotationAnchor = 'viewportPivot',
  style,
}: FireSelectorGraphicProps) {
  const { theme } = useTheme();
  const strokeColor = strokeColorProp ?? theme.colors.foreground;
  const SvgComponent = SELECTOR_SVG[replicaType];
  const pivot = getFireSelectorPivot(replicaType);
  const { graphicWidth, graphicHeight, containerWidth, containerHeight } = fitGraphicAtRotation(
    replicaType,
    rotationDeg,
    size,
    pivot,
  );

  const svgCenterLayout = useMemo(() => {
    if (rotationAnchor !== 'svgCenter') {
      return null;
    }

    const { graphicLeft, graphicTop } = graphicOffsetForPivotRotation(
      graphicWidth,
      graphicHeight,
      pivot,
      rotationDeg,
      containerWidth,
      containerHeight,
    );

    return {
      graphicLeft,
      graphicTop,
      transform: rnTransformAroundPivot(rotationDeg, pivot, graphicWidth, graphicHeight),
    };
  }, [
    containerHeight,
    containerWidth,
    graphicHeight,
    graphicWidth,
    pivot,
    rotationAnchor,
    rotationDeg,
  ]);

  const viewportPivotLayout = useMemo(() => {
    if (rotationAnchor !== 'viewportPivot') {
      return null;
    }

    const { tx, ty, graphicLeft, graphicTop } = pivotTransformInContainer(
      pivot,
      graphicWidth,
      graphicHeight,
      containerWidth,
      containerHeight,
    );

    return {
      graphicLeft,
      graphicTop,
      transform: [
        { translateX: tx },
        { translateY: ty },
        { rotate: `${rotationDeg}deg` },
        { translateX: -tx },
        { translateY: -ty },
      ] as const,
    };
  }, [
    containerHeight,
    containerWidth,
    graphicHeight,
    graphicWidth,
    pivot,
    rotationAnchor,
    rotationDeg,
  ]);

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
      {svgCenterLayout ? (
        <View
          style={{
            position: 'absolute',
            left: svgCenterLayout.graphicLeft,
            top: svgCenterLayout.graphicTop,
            width: graphicWidth,
            height: graphicHeight,
            transform: svgCenterLayout.transform,
          }}
        >
          <SvgComponent
            width={graphicWidth}
            height={graphicHeight}
            color={strokeColor}
            stroke={strokeColor}
          />
        </View>
      ) : viewportPivotLayout ? (
        <View
          style={[
            styles.rotated,
            {
              width: containerWidth,
              height: containerHeight,
              transform: viewportPivotLayout.transform,
            },
          ]}
        >
          <SvgComponent
            width={graphicWidth}
            height={graphicHeight}
            color={strokeColor}
            stroke={strokeColor}
            style={{
              position: 'absolute',
              left: viewportPivotLayout.graphicLeft,
              top: viewportPivotLayout.graphicTop,
            }}
          />
        </View>
      ) : null}
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
