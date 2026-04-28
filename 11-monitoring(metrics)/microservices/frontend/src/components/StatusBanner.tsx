type StatusBannerProps = {
  tone: "error" | "success";
  message: string;
};

export function StatusBanner({ tone, message }: StatusBannerProps) {
  return <div className={`status status--${tone}`}>{message}</div>;
}
