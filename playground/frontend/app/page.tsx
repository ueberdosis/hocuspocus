export default function Home() {
	return (
		<div className="flex flex-col min-h-screen">
			{/* Header */}
			<header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
				<div className="px-8 py-6">
					<h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
						Hocuspocus v3 Playground
					</h1>
					<p className="text-slate-600 dark:text-slate-400 mt-2">
						Real-time collaborative editor demo
					</p>
				</div>
			</header>

			{/* Main content */}
			<main className="flex-1 p-8">
				<div className="max-w-4xl mx-auto">
					{/* Welcome card */}
					<div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-8 mb-8">
						<div className="flex items-center mb-6">
							<div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-xl flex items-center justify-center mr-4">
								<span className="text-white text-xl">🚀</span>
							</div>
							<h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome!</h2>
						</div>
						<p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed mb-6">
							This demo showcases how to use a shared WebSocket connection to load multiple documents with real-time collaboration.
						</p>
						<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
							<p className="text-blue-800 dark:text-blue-200 font-medium">
								💡 Tip: Open a second tab or window and experience collaborative editing in real-time!
							</p>
						</div>
					</div>

					{/* Features grid */}
					<div className="grid md:grid-cols-2 gap-6 mb-8">
						<div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 p-6">
							<div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-4">
								<span className="text-white text-lg">🔌</span>
							</div>
							<h3 className="font-semibold text-slate-900 dark:text-white mb-2">Smart Connection</h3>
							<p className="text-slate-600 dark:text-slate-400 text-sm">
								WebSocket connection opens when you enter article routes and closes when you leave.
							</p>
						</div>

						<div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 p-6">
							<div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center mb-4">
								<span className="text-white text-lg">📄</span>
							</div>
							<h3 className="font-semibold text-slate-900 dark:text-white mb-2">On-Demand Loading</h3>
							<p className="text-slate-600 dark:text-slate-400 text-sm">
								Documents are fetched as needed via the shared connection for optimal performance.
							</p>
						</div>
					</div>

					{/* Debug info */}
					<div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
						<div className="flex items-center mb-3">
							<div className="w-8 h-8 bg-gradient-to-br from-slate-500 to-slate-600 rounded-lg flex items-center justify-center mr-3">
								<span className="text-white text-sm">🔍</span>
							</div>
							<h3 className="font-semibold text-slate-700 dark:text-slate-300">Developer Console</h3>
						</div>
						<p className="text-slate-600 dark:text-slate-400 text-sm">
							Open your browser's developer console to see detailed connection and synchronization information.
						</p>
					</div>
				</div>
			</main>
		</div>
	);
}
