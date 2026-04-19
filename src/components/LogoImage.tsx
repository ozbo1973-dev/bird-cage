import Image from "next/image";
import defaultStyles from "./LogoImage.module.css";

interface LogoImageProps {
  width: number;
  height: number;
  priority: boolean;
  styles?: string;
}

function LogoImage({
  width,
  height,
  priority = false,
  styles = defaultStyles.logoImg,
}: LogoImageProps) {
  return (
    <Image
      src="/logo.svg"
      alt="Bird Cage"
      width={width || 220}
      height={height || 147}
      className={styles}
      priority={priority}
    />
  );
}

export default LogoImage;
