export const awarenessStatesToArray = (
	states: Map<number, Record<string, any>>,
) => {
	return Array.from(states.entries()).map(([key, value]) => {
		return {
			clientId: key,
			...value,
		};
	});
};
