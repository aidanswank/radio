var container = document.getElementById('background-canvas');
var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 2;

var light1 = new THREE.DirectionalLight(0xefefff, 3);
light1.position.set(1, 1, 1).normalize();
scene.add(light1);
var light2 = new THREE.DirectionalLight(0xffefef, 3);
light2.position.set(-1, -1, -1).normalize();
scene.add(light2);

window.addEventListener("resize", function() {
  let width = window.innerWidth;
  let height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});

var loader = new THREE.GLTFLoader();
var mixer;
var model;
loader.load(
  "Untitled_Scan_23_44_20.gltf", function(gltf) {
    gltf.scene.traverse(function(node) {
      if (node instanceof THREE.Mesh) { 
        node.castShadow = true; 
        node.material.side = THREE.DoubleSide;
      }
    });

    model = gltf.scene;
    model.scale.set(1, 1, 1);
    scene.add(model);

    mixer = new THREE.AnimationMixer(model);
    mixer.clipAction(gltf.animations[1]).play();

    document.body.addEventListener("click", function() {
      mixer.clipAction(gltf.animations[1]).stop();
      mixer.clipAction(gltf.animations[0]).play();
      setTimeout(function() {
        mixer.clipAction(gltf.animations[0]).stop();
        mixer.clipAction(gltf.animations[1]).play();
      }, 1500);
    });
  });

var clock = new THREE.Clock();
function render() {
  requestAnimationFrame(render);
  var delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  if (model) model.rotation.y += 0.0005;

  renderer.render(scene, camera);
}
render();
