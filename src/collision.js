export function distanceBetweenPoints(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function pointInCircle(point, circle) {
  return distanceBetweenPoints(point, circle) <= circle.radius;
}

export function getBladeSpeed(previous, current, deltaSeconds) {
  if (!previous || !current || deltaSeconds <= 0) return 0;
  return distanceBetweenPoints(previous, current) / deltaSeconds;
}

export function lineIntersectsCircle(start, end, circle) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return pointInCircle(start, circle);
  const t = Math.max(0, Math.min(1, ((circle.x - start.x) * dx + (circle.y - start.y) * dy) / lengthSquared));
  const closest = { x: start.x + t * dx, y: start.y + t * dy };
  return distanceBetweenPoints(closest, circle) <= circle.radius;
}

export function lineIntersectsRectangle(start, end, rect) {
  if (pointInRect(start, rect) || pointInRect(end, rect)) return true;
  const edges = [
    [{ x: rect.x, y: rect.y }, { x: rect.x + rect.width, y: rect.y }],
    [{ x: rect.x + rect.width, y: rect.y }, { x: rect.x + rect.width, y: rect.y + rect.height }],
    [{ x: rect.x + rect.width, y: rect.y + rect.height }, { x: rect.x, y: rect.y + rect.height }],
    [{ x: rect.x, y: rect.y + rect.height }, { x: rect.x, y: rect.y }],
  ];
  return edges.some(([a, b]) => segmentsIntersect(start, end, a, b));
}

function pointInRect(point, rect) {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}

function segmentsIntersect(a, b, c, d) {
  const denominator = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  if (denominator === 0) return false;
  const ua = ((d.x - c.x) * (a.y - c.y) - (d.y - c.y) * (a.x - c.x)) / denominator;
  const ub = ((b.x - a.x) * (a.y - c.y) - (b.y - a.y) * (a.x - c.x)) / denominator;
  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}
