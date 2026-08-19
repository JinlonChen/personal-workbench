import Image from "next/image";

import longxuDragon from "@/assets/longxu-dragon.png";

export function BrandMark() {
  return <Image className="brand-mark" src={longxuDragon} width={72} height={72} alt="龍字标识" priority />;
}
