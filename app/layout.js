import "./globals.css";

export const metadata = {
  title: "Exampen | Courses",
  description: "Your enrolled courses"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
