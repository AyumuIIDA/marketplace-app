export function combineClassNames(...classNames: Array<string | false | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}
