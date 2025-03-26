export default function Home() {
	return (
		<div className={"prose"}>
			<p>Welcome to the Hocuspocus v3 playground!</p>
			<br />

			<p>
				This demo is showing how to use a shared websocket connection to load
				multiple documents. Just open a second tab/window and experience
				collaborative editing :)
			</p>
			<p>
				The websocket is opened once you enter the articles/ routes and closed
				when you leave them.
			</p>
			<p>
				Documents are fetched as needed (article 1 - 4) via the shared
				connection.
			</p>
		</div>
	);
}
