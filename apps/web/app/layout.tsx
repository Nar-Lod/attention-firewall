import type {ReactNode} from "react";
import "./globals.css";
export const metadata={title:"Attention Firewall",description:"Privacy-first attention management."};
export default function RootLayout({children}:{children:ReactNode}){return <html lang="en"><body>{children}</body></html>}
