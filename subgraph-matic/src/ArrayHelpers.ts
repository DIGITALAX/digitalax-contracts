export function isChildInList(childId: string, ids: Array<string>): boolean {
  let totalIds = ids.length;
  for (let i = 0; i < totalIds; i++) {
    if (ids[i] === childId) {
      return true;
    }
  }
  return false;
}
