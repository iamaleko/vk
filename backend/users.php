<?
/**
 * @file: Server search emulation, messy, cause it must be at least partly done in db
 * @author: Alexander Kolobov
 */

$queries = array();
$data_file = './users-extended.js';
$data_json = null;
$json = array(
    'error' => 0,
    'message' => 'OK',
    'users' => array()
);

// get queries

if(isset($_POST['query']) && is_array($_POST['query'])) {
    foreach($_POST['query'] as $query) {
        if($query) {
            $queries[] = urldecode($query);
        }
    } 
} else {
    $json['error'] = 1;
    $json['message'] = 'Invalid type of request.';
}

// load data

if(file_exists($data_file)) {
    $data_json = file_get_contents($data_file);
    if($data_json) {
        $data_json = json_decode($data_json, true);
        if(!$data_json) {
            $json["error"] = 3;
            $json['message'] = 'Unable to parse data file.';
        }
    }
} else {
    $json["error"] = 2;
    $json['message'] = 'Unable to open data file.';
}

// search data

if(count($queries) && $data_json) {
    foreach($queries as $query) {
        foreach($data_json['us']['pn'] as $index => $pn) {
            if(mb_strpos($pn, $query) !== false) $json['users'][] = $data_json['us']['id'][$index]; 
        }
    }
    $json['users'] = array_unique($json['users']);
}

header('Content-Type: application/json');
echo 'for(;;);'.json_encode($json);
exit;