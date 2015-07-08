<?
/**
 * @file: Avatars generation
 * @author: Alexander Kolobov
 */

$size = 32;
$mesh = 3;
$image = imagecreatetruecolor($size, $size);
$x = 0;
$y = 0;
$i = $mesh*$mesh;
$step = $size/$mesh;
imagefill($image, 0, 0, imagecolorallocate($image, 255, 255, 255));
while($i--) {
    imagefilledrectangle($image, $x*$step, $y*$step, ($x+1)*$step, ($y+1)*$step,
        imagecolorallocatealpha($image, 89, 125, 163, rand(0,127)));
    $i%$mesh ? $x++ : $y++ != $x=0;
}
header("Content-type: image/png");
imagepng($image);
imagedestroy($image);
exit; 