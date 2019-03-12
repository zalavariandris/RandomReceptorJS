var camera, renderer, video;
var maskScene, maskFbo;
var videoScene, videoFbo;
var scene, buffer, fbo;

init();
animate();

window.onresize = function(e){
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function init(){
    // Init Grabber
    video = document.getElementById( 'webcam' );

    if ( navigator.mediaDevices && navigator.mediaDevices.getUserMedia ) {
        var constraints = { video: { width: 1280, height: 720, facingMode: 'user' } };
        navigator.mediaDevices.getUserMedia( constraints ).then( function ( stream ) {
            // apply the stream to the video element used in the texture
            video.srcObject = stream;
            video.play();
        } ).catch( function ( error ) {
            console.error( 'Unable to access the camera/webcam.', error );
        } );
    } else {
        console.error( 'MediaDevices interface not available.' );
    }

    // The Camera
    camera = new THREE.OrthographicCamera( -0.5, 0.5, -0.5, 0.5, -1000, 1000 );

    // The Renderer
    renderer = new THREE.WebGLRenderer({
        preserveDrawingBuffer: true,
        alphe: true,
        antialias: false
    });
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.autoClear = false;

    // add canvas to document
    var viewport = document.getElementById( 'viewport' );
    viewport.appendChild( renderer.domElement );

    // Construct Video Scene      
    videoScene = new THREE.Scene();
    videoScene.add( new THREE.Mesh( 
        new THREE.PlaneGeometry(), 
        new THREE.MeshBasicMaterial( { 
            map: new THREE.VideoTexture( video ), 
            color:"white",
            side: THREE.DoubleSide
        } )
    ) );
    videoFbo = new THREE.WebGLRenderTarget(500, 500);

    // Construct Mask Scene
    maskScene = new THREE.Scene();
    for(var i=0; i< 1000; i++){
        maskMesh = new THREE.Mesh(
            new THREE.CircleBufferGeometry(0.01,8),
            new THREE.MeshBasicMaterial( { 
                color:"white",
                side: THREE.DoubleSide
            })
        );
        maskMesh.position.set(Math.random()-0.5, Math.random()-0.5, 0);
        maskScene.add(maskMesh);
    }
    maskFbo = new THREE.WebGLRenderTarget(500, 500);

    // Construct Main Scene
    buffer = new THREE.WebGLRenderTarget(500, 500);
    fbo = new THREE.WebGLRenderTarget(500, 500);
    scene = new THREE.Scene();
    scene.add(new THREE.Mesh(
        new THREE.PlaneGeometry(),
        new THREE.MeshBasicMaterial( { 
            color:"white",
            map: buffer.texture,
            side: THREE.DoubleSide
        })
    ));

    scene.add(new THREE.Mesh(
        new THREE.PlaneGeometry(), 
        new THREE.ShaderMaterial( {
            vertexShader: "\
                varying vec2 vUv; \
                void main() { \
                  vUv = uv;  \
                  gl_Position =   projectionMatrix * \
                            modelViewMatrix * \
                            vec4(position,1.0); \
                }",
            fragmentShader: "\
                uniform sampler2D texture1; \
                uniform sampler2D mask; \
                varying vec2 vUv; \
                void main() { \
                    vec4 texColor = texture2D(texture1, vUv); \
                    vec4 maskColor = texture2D(mask, vUv); \
                    gl_FragColor = vec4(texColor.rgb, maskColor.r); \
                }",
            uniforms: {
                texture1: { type: "t", value: videoFbo.texture },
                mask: { type: "t", value: maskFbo.texture }
            }, 
            side: THREE.DoubleSide,
            transparent: true
        } )
    ));

    // final scene
    finalScene = new THREE.Scene();
    finalScene.add(new THREE.Mesh(
        new THREE.PlaneGeometry(),
            new THREE.MeshBasicMaterial( { 
                color:"white",
                map: fbo.texture,
                side: THREE.DoubleSide
            })
    ));
}

function animate(){
    // main loop
    requestAnimationFrame( animate );

    // Animate Mask Scene
    for(var child of maskScene.children){
        child.position.set(Math.random()-0.5, Math.random()-0.5, 0);
    }

    // Render to mask fbo
    renderer.setRenderTarget(maskFbo);
    renderer.clear();
    renderer.render(maskScene, camera);

    // Render to video fbo
    renderer.setRenderTarget(videoFbo);
    renderer.render(videoScene, camera);

    // render buffer fbo to fbo
    // render mainScene to fbo
    renderer.setRenderTarget(fbo);
    renderer.render(scene, camera);

    // Render main scene
    renderer.setRenderTarget(null);
    renderer.render(finalScene, camera);

    renderer.setRenderTarget(buffer);
    renderer.render(finalScene, camera);
}