import Link from "next/link";
import "./globals.css";

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
				<div className="flex min-h-screen">
					{/* Sidebar */}
					<div className="w-64 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-r border-slate-200 dark:border-slate-700 shadow-sm">
						<div className="p-6">
							<div className="mb-8">
								<Link href="/" className="flex items-center space-x-2 text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
									<div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
										<span className="text-white font-bold text-sm">H</span>
									</div>
									<span className="font-semibold">Hocuspocus</span>
								</Link>
							</div>

							<nav className="space-y-6">
								<div>
									<h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Classic Provider</h2>
									<ul className="space-y-2">
										{[1, 2, 3, 4].map((num) => (
											<li key={num}>
												<Link
													href={`/articles/${num}`}
													className="flex items-center px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200"
												>
													<div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full mr-3"></div>
													Article {num}
												</Link>
											</li>
										))}
									</ul>
								</div>
								<div>
									<h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">React Provider</h2>
									<ul className="space-y-2">
										{[1, 2, 3, 4].map((num) => (
											<li key={num}>
												<Link
													href={`/react-provider/${num}`}
													className="flex items-center px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-200"
												>
													<div className="w-2 h-2 bg-purple-400 dark:bg-purple-500 rounded-full mr-3"></div>
													Article {num}
												</Link>
											</li>
										))}
									</ul>
								</div>
							</nav>
						</div>
					</div>

					{/* Main content */}
					<div className="flex-1 overflow-hidden">
						{children}
					</div>
				</div>
			</body>
		</html>
	);
}
