/** 初始相机：斜俯视东亚 */
export const INITIAL_POV = { lat: 28, lng: 108, altitude: 2.3 }
/** 闲置多久后恢复自转（ms） */
export const RESUME_AFTER_IDLE = 10_000
/** 相机飞行时长（ms） */
export const FLIGHT_MS = 800
/** 相机高度低于该值时显示城市名称（再远只留点，避免密集） */
export const LABEL_ALT_THRESHOLD = 2.6
