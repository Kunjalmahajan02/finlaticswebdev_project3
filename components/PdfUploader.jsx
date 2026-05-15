import React, { useRef } from "react";

const PdfUploader = ({ onUpload }) => {
	const fileInput = useRef();

	const handleChange = (e) => {
		if (e.target.files[0]) {
			onUpload(e.target.files[0]);
		}
	};

	return (
		<div>
			<input type="file" accept="application/pdf" ref={fileInput} onChange={handleChange} />
		</div>
	);
};

export default PdfUploader;
