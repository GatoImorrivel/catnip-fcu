import type { FC } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { SvgProps } from 'react-native-svg';

import {
  fitGraphicInSquare,
  shortestRotationDelta,
} from '@/components/fire-selector/fire-selector-graphic-utils';
import { useTheme } from '@/hooks/use-theme';
import { getFireSelectorPivot } from '@/replicas/fire-selector-pivot';
import { pivotToPixel } from '@/replicas/fire-selector-pivot-math';
import type { ReplicaType } from '@/replicas/types';

import M4FireSelector from '../../../assets/m4_style/fire_selector.svg';
import AkFireSelector from '../../../assets/ak_style/fire_selector.svg';

const SELECTOR_SVG: Record<ReplicaType, FC<SvgProps>> = {
  M4: M4FireSelector,
  AK: AkFireSelector,
};

const M4_ASPECT = 512 / 1024;
const AK_ASPECT = 176.67398 / 52.871712;

const ROTATION_SPRING = {
  damping: 20,
  stiffness: 280,
  mass: 0.8,
};

type AnimatedFireSelectorGraphicProps = {
  replicaType: ReplicaType;
  rotationDeg: number;
  size?: number;
  style?: ViewStyle;
};

export function AnimatedFireSelectorGraphic({
  replicaType,
  rotationDeg,
  size = 180,
  style,
}: AnimatedFireSelectorGraphicProps) {
  const { theme } = useTheme();
  const strokeColor = theme.colors.foreground;
  const SvgComponent = SELECTOR_SVG[replicaType];
  const aspect = replicaType === 'M4' ? M4_ASPECT : AK_ASPECT;
  const pivot = getFireSelectorPivot(replicaType);
  const { graphicWidth, graphicHeight, containerWidth, containerHeight } = fitGraphicInSquare(
    aspect,
    0,
    size,
    pivot,
  );

  const pivotOffset = useMemo(
    () => pivotToPixel(pivot, graphicWidth, graphicHeight),
    [graphicHeight, graphicWidth, pivot],
  );

  const animatedRotation = useSharedValue(rotationDeg);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      animatedRotation.value = rotationDeg;
      isFirstRender.current = false;
      return;
    }

    const delta = shortestRotationDelta(animatedRotation.value, rotationDeg);
    animatedRotation.value = withSpring(animatedRotation.value + delta, ROTATION_SPRING);
  }, [animatedRotation, rotationDeg]);

  const animatedStyle = useAnimatedStyle(() => {
    const tx = pivotOffset.px - graphicWidth / 2;
    const ty = pivotOffset.py - graphicHeight / 2;

    return {
      transform: [
        { translateX: tx },
        { translateY: ty },
        { rotate: `${animatedRotation.value}deg` },
        { translateX: -tx },
        { translateY: -ty },
      ],
    };
  }, [graphicHeight, graphicWidth, pivotOffset.px, pivotOffset.py]);

  return (
    <View
      style={[
        styles.container,
        { width: containerWidth, height: containerHeight },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.rotated,
          { width: graphicWidth, height: graphicHeight },
          animatedStyle,
        ]}
      >
        <SvgComponent
          width={graphicWidth}
          height={graphicHeight}
          color={strokeColor}
          stroke={strokeColor}
        />
      </Animated.View>
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
