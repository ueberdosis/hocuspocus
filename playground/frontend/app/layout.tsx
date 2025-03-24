import Link from "next/link";
import "./globals.css";

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className="m-4">
				<div className="grid grid-cols-10">
					<div className="col-span-2">
						<ul>
							<li>
								<Link href="/">Homepage</Link>
							</li>
						</ul>

						<h1 className="mt-4">List of articles:</h1>

						<ul className="ml-6 list-disc">
							<li>
								<Link href="/articles/1">Article 1</Link>
							</li>
							<li>
								<Link href="/articles/2">Article 2</Link>
							</li>
							<li>
								<Link href="/articles/3">Article 3</Link>
							</li>
							<li>
								<Link href="/articles/4">Article 4</Link>
							</li>
						</ul>
					</div>

					<div className="col-span-8">{children}</div>
				</div>
			</body>
		</html>
	);
}
