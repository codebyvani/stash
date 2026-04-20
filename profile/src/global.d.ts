/* eslint-disable @typescript-eslint/no-explicit-any */
import '@react-three/fiber';

declare module '@react-three/fiber' {
  interface ThreeElements {
    bentPlaneGeometry: any;
  }
}
