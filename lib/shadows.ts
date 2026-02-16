import { Platform, ViewStyle } from "react-native";

export function cardShadow(color: string): ViewStyle {
  return Platform.select({
    web: {
      boxShadow: `0px 2px 8px ${color}`,
    } as any,
    default: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 2,
    },
  }) as ViewStyle;
}

export function smallShadow(color: string): ViewStyle {
  return Platform.select({
    web: {
      boxShadow: `0px 1px 4px ${color}`,
    } as any,
    default: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 2,
    },
  }) as ViewStyle;
}
