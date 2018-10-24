//tslint:disable:no-any
declare module 'thunky' {
  export = thunky;
  type Thunky = <T>(fn: T) => T;

  const thunky: Thunky;
}
