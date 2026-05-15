import React from "react";

const ChunkSourceList = ({ sources }) => (
	<ul>
		{sources.map((src, idx) => (
			<li key={idx}>{src}</li>
		))}
	</ul>
);

export default ChunkSourceList;
