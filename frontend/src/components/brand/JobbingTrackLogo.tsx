import Image from "next/image";

type JobbingTrackLogoProps = {
  className?: string;
  imgClassName?: string;
  showText?: boolean;
  textClassName?: string;
};

export function JobbingTrackLogo({
  className = "",
  imgClassName = "h-10 w-10",
  showText = true,
  textClassName = "",
}: JobbingTrackLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Image
        src="/brand/jobbingtrack-logo.png"
        alt="Logo JobbingTrack"
        width={96}
        height={96}
        priority={false}
        className={`shrink-0 rounded-xl object-contain ${imgClassName}`}
      />
      {showText ? <span className={textClassName}>JobbingTrack</span> : null}
    </span>
  );
}
