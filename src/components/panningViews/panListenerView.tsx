import _ from 'lodash';
import React, {PureComponent} from 'react';
import {
  PanResponder,
  PanResponderInstance,
  GestureResponderEvent,
  PanResponderGestureState,
  LayoutChangeEvent,
  LayoutRectangle
} from 'react-native';
import asPanViewConsumer from './asPanViewConsumer';
import PanningProvider, {
  DIRECTIONS,
  DirectionsProps,
  AmountsProps
} from './panningProvider';
import View from '../view';

interface PanningPropTypes {
    /**
     * This is were you will get notified when a drag occurs
     * onDrag = ({directions, deltas}) => {...}
     * directions - array of directions
     * deltas - array of deltas (same length and order as directions)
     * Both arrays will have {x, y} - if no x or y drag has occurred this value will be undefined
     */
    onDrag?: ({directions, deltas}: ({directions: DirectionsProps, deltas: AmountsProps})) => void;
    /**
     * This is were you will get notified when a swipe occurs
     * onSwipe = ({directions, velocities}) => {...}
     * directions - array of directions
     * velocities - array of velocities (same length and order as directions)
     * Both arrays will have {x, y} - if no x or y swipe has occurred this value will be undefined
     */
    onSwipe?: ({directions, velocities}: ({directions: DirectionsProps, velocities: AmountsProps})) => void;
    /**
     * This is were you will get notified when the pan starts
     */
    onPanStart?: () => void;
    /**
     * This is were you will get notified when the pan ends
     * The user has released all touches while this view is the responder.
     * This typically means a gesture has succeeded
     */
    onPanRelease?: () => void;
    /**
     * This is were you will get notified when the pan ends
     * Another component has become the responder,
     * so this gesture should be cancelled
     */
    onPanTerminated?: () => void;
}

export interface PanListenerViewPropTypes extends PanningPropTypes {
    /**
     * The directions of the allowed pan (default allows all directions)
     * Types: UP, DOWN, LEFT and RIGHT (using PanningProvider.Directions.###)
     */
    directions?: DIRECTIONS[];
    /**
     * The sensitivity beyond which a pan is no longer considered a single click (default is 5)
     */
    panSensitivity?: number;
    /**
     * The sensitivity beyond which a pan is no longer considered a drag, but a swipe (default is 1.8)
     * Note: a pan would have to occur (i.e. the panSensitivity has already been surpassed)
     */
    swipeVelocitySensitivity?: number;
    /**
     * Is there a view that is clickable (has onPress etc.) in the PanListenerView.
     * This can affect the panability of this component.
     */
    isClickable?: boolean;
}

interface Props extends PanListenerViewPropTypes {
  context?: PanningPropTypes;
}

interface PanningResultProps {
  selectedDirections: DirectionsProps;
  selectedAmounts: AmountsProps;
}

const DEFAULT_PAN_SENSITIVITY = 5;
const DEFAULT_SWIPE_VELOCITY = 1.8;

/**
 * @description: PanListenerView component created to making listening to swipe and drag events easier
 * @example: https://github.com/wix/react-native-ui-lib/blob/master/demo/src/screens/componentScreens/PanListenerScreen.js
 */
class PanListenerView extends PureComponent<Props> {
  static displayName = 'PanListenerView';
  
  public static defaultProps: Partial<Props> = {
    directions: [
      PanningProvider.Directions.UP,
      PanningProvider.Directions.DOWN,
      PanningProvider.Directions.LEFT,
      PanningProvider.Directions.RIGHT
    ],
    panSensitivity: DEFAULT_PAN_SENSITIVITY,
    swipeVelocitySensitivity: DEFAULT_SWIPE_VELOCITY
  };

  private panResponder: PanResponderInstance;
  private layout: LayoutRectangle;

  constructor(props: PanListenerViewPropTypes) {
    super(props);

    const {isClickable} = props;
    this.panResponder = PanResponder.create({
      onStartShouldSetPanResponder: isClickable ? this.shouldPan : this.yes,
      onMoveShouldSetPanResponder: this.shouldPan,
      onStartShouldSetPanResponderCapture: this.no,
      onMoveShouldSetPanResponderCapture: this.no,
      onPanResponderGrant: this.handlePanStart,
      onPanResponderMove: this.handlePanMove,
      onPanResponderRelease: this.handlePanRelease,
      onPanResponderTerminate: this.handlePanTerminate
    });
  }

  yes = () => {
    return true;
  };

  no = () => {
    return false;
  };

  shouldPan = (e: GestureResponderEvent, gestureState: PanResponderGestureState) => {
    // return true if user is swiping, return false if it's a single click
    const {dy, dx} = gestureState;
    const {directions, panSensitivity} = this.props;

    console.log('Miki', panSensitivity);
    return (
      directions &&
      ((directions.includes(PanningProvider.Directions.UP) && dy < -panSensitivity) ||
        (directions.includes(PanningProvider.Directions.DOWN) && dy > panSensitivity) ||
        (directions.includes(PanningProvider.Directions.LEFT) && dx < -panSensitivity) ||
        (directions.includes(PanningProvider.Directions.RIGHT) && dx > panSensitivity))
    );
  };

  handlePanStart = () => {
    _.invoke(this.props, 'onPanStart');
    _.invoke(this.props.context, 'onPanStart');
  };

  getSwipeDirection = ({vx, vy}: ({vx: number, vy: number})): PanningResultProps => {
    const {swipeVelocitySensitivity} = this.props;
    return this.getDirectionsOverSensitivity(vx, vy, swipeVelocitySensitivity);
  };

  getDragDirection = ({dx, dy}: ({dx: number, dy: number})): PanningResultProps => {
    return this.getDirectionsOverSensitivity(dx, dy, 0);
  };

  getDirectionsOverSensitivity = (x: number, y: number, sensitivity: number): PanningResultProps => {
    const {directions} = this.props;
    const selectedDirections: DirectionsProps = {};
    const selectedAmounts: AmountsProps = {};

    if (directions.includes(PanningProvider.Directions.LEFT) && x < -sensitivity) {
      selectedDirections.x = PanningProvider.Directions.LEFT;
      selectedAmounts.x = x;
    } else if (directions.includes(PanningProvider.Directions.RIGHT) && x > sensitivity) {
      selectedDirections.x = PanningProvider.Directions.RIGHT;
      selectedAmounts.x = x;
    }

    if (directions.includes(PanningProvider.Directions.UP) && y < -sensitivity) {
      selectedDirections.y = PanningProvider.Directions.UP;
      selectedAmounts.y = y;
    } else if (directions.includes(PanningProvider.Directions.DOWN) && y > sensitivity) {
      selectedDirections.y = PanningProvider.Directions.DOWN;
      selectedAmounts.y = y;
    }

    return {selectedDirections, selectedAmounts};
  };

  panResultHasValue = (panResult?: PanningResultProps): boolean => {
    return Boolean(panResult && (panResult.selectedDirections.x || panResult.selectedDirections.y));
  };

  handlePanMove = (e: GestureResponderEvent, gestureState: PanResponderGestureState) => {
    const {onSwipe, onDrag, context} = this.props;
    const hasSwipe = !_.isUndefined(onSwipe);
    const hasDrag = !_.isUndefined(onDrag);
    const hasContext = !_.isUndefined(context);
    let panResult;
    if (hasSwipe || hasContext) {
      panResult = this.getSwipeDirection(gestureState);
    }

    if (this.panResultHasValue(panResult)) {
      // @ts-ignore
      const data = {directions: panResult.selectedDirections, velocities: panResult.selectedAmounts};
      _.invoke(this.props, 'onSwipe', data);
      _.invoke(context, 'onSwipe', data);
    } else if (hasDrag || hasContext) {
      panResult = this.getDragDirection(gestureState);
      if (this.panResultHasValue(panResult)) {
        const data = {directions: panResult.selectedDirections, deltas: panResult.selectedAmounts};
        _.invoke(this.props, 'onDrag', data);
        _.invoke(context, 'onDrag', data);
      }
    }
  };

  handlePanRelease = () => {
    _.invoke(this.props, 'onPanRelease');
    _.invoke(this.props.context, 'onPanRelease');
  };

  handlePanTerminate = () => {
    _.invoke(this.props, 'onPanTerminated');
    _.invoke(this.props.context, 'onPanTerminated');
  };

  onLayout = (event: LayoutChangeEvent) => {
    this.layout = event.nativeEvent.layout;
  };

  render() {
    const {children, ...others} = this.props;

    return (
      <View {...others} {...this.panResponder.panHandlers} onLayout={this.onLayout}>
        {children}
      </View>
    );
  }
}

export default asPanViewConsumer<PanListenerViewPropTypes>(PanListenerView);
