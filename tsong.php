<?php
	// This script serves as an API that
	// returns a list of passages or the content of a passage
	// in the JSON format.

	header("Content-Type: application/json");

	error_reporting(E_ALL);

	// Send an HTTP response code of 400 (Bad Request),
	// and send JSON containing the specified error message ($errorMessage).
	function respond_bad_request($errorMessage) {
		http_response_code(400);

		$ret = array();
		$ret["error"] = "$errorMessage";
		print(json_encode($ret));
	}

	// Returns an array listing the filenames of passages.
	function list_passages() {
		$files = glob("./text/*");
		for ($i = 0; $i < count($files); $i++) {
			$files[$i] = basename($files[$i]);
		}
		return $files;
	}

	// Given the path ($path) to a passage, returns the content of the passage
	// as an array, including the ID of each section in the passage,
	// and each line in the passage as an array item.
	function fetch_passage($path) {
		$text = file_get_contents($path);
		$lines = explode("\n", $text);
		$ret = array();

		$i = 0;
		$pCounter = 0;
		while ($i < count($lines) - 2) {
			// Skip comments
			while ($lines[$i][0] === "#") {
				$i++;
			}

			// Parse main text
			$sectionId = substr($lines[$i], 4, -3);
			$i++;

			$ret[$pCounter] = array();
			$ret[$pCounter]["id"] = $sectionId;
			$ret[$pCounter]["text"] = array();
			do {
				array_push($ret[$pCounter]["text"], $lines[$i]);
				$i++;
			} while ($lines[$i] && $lines[$i][0] !== "<");

			$pCounter++;
		}

		return $ret;
	}

	if (isset($_GET["mode"]) && $_GET["mode"] !== "") {
		switch($_GET["mode"]) {
			case "list-passages":
				print(json_encode(list_passages()));
				break;
			case "fetch-passage":
				if (isset($_GET["passage"]) && $_GET["passage"] !== "") {
					$filename = basename($_GET["passage"]); // prevent bad input
					$path = "./text/$filename";
					if (!file_exists($path)) {
						respond_bad_request("No such file!");
					} else {
						print(json_encode(fetch_passage($path)));
					}
				} else {
					respond_bad_request("Which passage?");
				}
				break;
			default:
				respond_bad_request("That's not a valid mode!");
				break;
		}
	} else {
		respond_bad_request("What mode?");
	}
?>
