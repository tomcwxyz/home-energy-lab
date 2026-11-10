import './globals.css';
export const metadata = { title:'Home Energy Lab', description:'Private energy monitoring and experiments', robots:{index:false,follow:false}, appleWebApp:{capable:true,title:'Energy Lab',statusBarStyle:'default'} };
export const viewport = { width:'device-width',initialScale:1,themeColor:'#273531' };
export default function RootLayout({children}) { return <html lang="en-GB"><body>{children}</body></html>; }
