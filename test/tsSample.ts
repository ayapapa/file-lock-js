export interface HogeIf {
  a: number;
  b: number;
  adder(x: number, y: number): number;
}

class Adder implements HogeIf {
  constructor(i:number) {
    this.a = i;
    this.b = i * i;
  }
  a: number = 0;
  b: number = 0;
  adder(x: number, y: number): number {
    return x + y;
  }
}


class Xyx extends Adder {
  adder(x: number, y: number): number {
    return x + y + 1;
  }
}

// クラスのインターフェイス」として static を型で表現する ケース（ちゃんと理解できていない）
// クラス“インスタンス”の形
interface AdderInstance {
  add(a: number, b: number): number;
}

// クラス“コンストラクタ（static側）”の形
interface AdderConstructor {
  new (): AdderInstance;                // new で作られるインスタンスの型
  staticAdd(a: number, b: number): number; // static メソッド
}

// 実クラス
class MyAdder implements AdderInstance {
  add(a: number, b: number): number {
    return a + b;
  }

  // これは「クラス側」に生える
  static staticAdd(a: number, b: number): number {
    return a + b;
  }
}

// コンストラクタ型としてアサイン
const Ctor: AdderConstructor = MyAdder;

// static メソッドに型安全でアクセス
Ctor.staticAdd(1, 2);

/* ★★以下のようには書けない
abstract class Base {
  static abstract run(): void;
}
interfase StaticBase {
  static abstract run(): void;
}

class Hoge implements AdderInstance {
  // これは「クラス側」に生える
  static add(a: number, b: number): number {
    return a + b;
  }
  // これは「クラス側」に生える
  add(a: number, b: number): number {
    return a + b;
  }
}
*/