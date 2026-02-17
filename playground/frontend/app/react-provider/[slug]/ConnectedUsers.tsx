"use client";

import { useHocuspocusAwareness } from "@hocuspocus/provider-react";
import { useEffect, useState } from "react";

const colors = [
	"bg-blue-500",
	"bg-green-500",
	"bg-purple-500",
	"bg-pink-500",
	"bg-amber-500",
	"bg-cyan-500",
	"bg-rose-500",
	"bg-indigo-500",
];

const ConnectedUsers = () => {
	const users = useHocuspocusAwareness();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	return (
		<div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3">
			<div className="flex items-center space-x-3">
				<span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
					Users
				</span>
				{mounted && (
					<>
						<div className="flex -space-x-2">
							{users.map((user, i) => (
								<div
									key={user.clientId}
									className={`w-7 h-7 rounded-full ${colors[i % colors.length]} border-2 border-white dark:border-slate-900 flex items-center justify-center`}
									title={`Client ${user.clientId}`}
								>
									<span className="text-white text-xs font-bold">
										{String(user.clientId).slice(-2)}
									</span>
								</div>
							))}
						</div>
						<span className="text-xs text-slate-500 dark:text-slate-400">
							{users.length} connected
						</span>
					</>
				)}
			</div>
		</div>
	);
};

export default ConnectedUsers;
