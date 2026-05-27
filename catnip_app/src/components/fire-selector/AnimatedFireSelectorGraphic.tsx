import type { FC } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { SvgProps } from 'react-native-svg';

import { fitGraphicForReplica, shortestRotationDelta } from '@/components/fire-selector/fire-selector-graphic-utils';
import { useTheme } from '@/hooks/use-theme';
import { getFireSelectorAspect } from '@/replicas/fire-selector-replica-config';
import { getFireSelectorPivot } from '@/replicas/fire-selector-pivot';
import { pivotTransformInContainer } from '@/replicas/fire-selector-pivot-math';
import type { ReplicaType } from '@/replicas/types';

import M4FireSelector from '../../../assets/m4_style/fire_selector.svg';
import AkFireSelector from '../../../assets/ak_style/fire_selector.svg';

const SELECTOR_SVG: Record<ReplicaType, FC<SvgProps>> = {
  M4: M4FireSelector,
  AK: AkFireSelector,
};

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
  const aspect = getFireSelectorAspect(replicaType);
  const pivot = getFireSelectorPivot(replicaType);
  const { graphicWidth, graphicHeight, containerWidth, containerHeight } = useMemo(
    () => fitGraphicForReplica(replicaType, aspect, size, pivot),
    [aspect, pivot, replicaType, size],
  );

  const { tx, ty, graphicLeft, graphicTop } = useMemo(
    () =>
      pivotTransformInContainer(
        pivot,
        graphicWidth,
        graphicHeight,
        containerWidth,
        containerHeight,
      ),
    [containerHeight, containerWidth, graphicHeight, graphicWidth, pivot],
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
    return {
      transform: [
        { translateX: tx },
        { translateY: ty },
        { rotate: `${animatedRotation.value}deg` },
        { translateX: -tx },
        { translateY: -ty },
      ],
    };
  }, [tx, ty]);

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
          { width: containerWidth, height: containerHeight },
          animatedStyle,
        ]}
      >
        <SvgComponent
          width={graphicWidth}
          height={graphicHeight}
          color={strokeColor}
          stroke={strokeColor}
          style={{
            position: 'absolute',
            left: graphicLeft,
            top: graphicTop,
          }}
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
