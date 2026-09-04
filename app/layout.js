import "./globals.css";
import SessionGuard from "./SessionGuard";

export const metadata = {
  title: "Exampen | Courses",
  description: "Your enrolled courses"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionGuard />
        {children}
      </body>
    </html>
  );
}
