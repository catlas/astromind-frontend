/**
 * Математически помощни функции за астрологични изчисления
 */

/**
 * Конвертира полярни координати в декартови за SVG
 * 
 * @param {number} centerX - X координата на центъра
 * @param {number} centerY - Y координата на центъра
 * @param {number} radius - Радиус
 * @param {number} angleInDegrees - Ъгъл в градуси
 * @returns {{x: number, y: number}} Декартови координати
 * 
 * ВАЖНО: 
 * - SVG 0° е на 3 часа (надясно)
 * - Астрология 0° (Aries) е на 9 часа (нагоре)
 * - Затова изваждаме 180° за да ротираме координатната система
 */
export function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  // Конвертиране на астрологичния ъгъл към SVG координатна система
  // Изваждаме 180° за да поставим 0° (Aries) на 9 часа
  const angleInRadians = (angleInDegrees - 180) * Math.PI / 180.0;
  
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

/**
 * Нормализира ъгъл в диапазона 0-360
 */
export function normalizeAngle(angle) {
  while (angle < 0) angle += 360;
  while (angle >= 360) angle -= 360;
  return angle;
}

/**
 * Конвертира градуси в радиани
 */
export function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}




