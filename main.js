// 全局变量
let scene, camera, renderer, ground, boxes, player, mikuPlane, earth, boulder;

// 物理参数配置
const PHYSICS = {
    gravity: -0.02,
    playerRadius: 0.5,
    boxSize: 1.0,
    pushForce: 0.25,
    friction: 0.9,
    angularFriction: 0.95,
    elasticity: 0.5,
    collisionEpsilon: 0.01,
    maxCollisionIterations: 5,
    playerHeight: 1.8,
    torqueMultiplier: 0.05,
    boxMass: 1.0,
    boxInertia: 1,
    boulderMass: 5.0,
    boulderRadius: 1.5,
    boulderFriction: 0.7,
    hillHeight: 10,
    hillRadius: 20
};

// 初始化函数
async function init() {
    try {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xF0F8FF);
        
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 1.6, 3);
        camera.lookAt(0, 1.6, 0);
        
        initRenderer();
        initLights();
        
        await Promise.all([
            initGround('grass.jpg'),
            initMikuPlane(),
            initBoxes(),
            initEarth(),
            initBoulder()
        ]);
        
        initPlayer();
        setupControls();
        animate();
        
        document.getElementById('debug').textContent = "场景加载完成！移动: WASD 或屏幕按钮";
    } catch (err) {
        handleError(err);
    }
}

function initRenderer() {
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        
        const style = renderer.domElement.style;
        style.position = 'fixed';
        style.top = '0';
        style.left = '0';
        style.zIndex = '1';
        
        document.body.appendChild(renderer.domElement);
    } catch (e) {
        throw new Error(`渲染器初始化失败: ${e.message}`);
    }
}

function initLights() {
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
}

async function initGround(texturePath) {
    try {
        const textureLoader = new THREE.TextureLoader();
        const texture = await new Promise((resolve, reject) => {
            textureLoader.load(texturePath, resolve, undefined, reject);
        });
        
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(10, 10);
        
        ground = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100),
            new THREE.MeshStandardMaterial({ 
                map: texture,
                side: THREE.DoubleSide,
                roughness: 0.8
            })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.1;
        ground.receiveShadow = true;
        scene.add(ground);
    } catch (err) {
        console.warn('草地贴图加载失败，使用默认材质');
        ground = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100),
            new THREE.MeshStandardMaterial({ 
                color: 0x7CFC00,
                side: THREE.DoubleSide,
                roughness: 0.8
            })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.1;
        ground.receiveShadow = true;
        scene.add(ground);
    }
}

async function initMikuPlane() {
    try {
        const textureLoader = new THREE.TextureLoader();
        const texture = await new Promise((resolve, reject) => {
            textureLoader.load('miku.jpg', resolve, undefined, reject);
        });
        
        texture.encoding = THREE.sRGBEncoding;
        const imgRatio = texture.image.height / texture.image.width;
        const width = 2;
        const height = width * imgRatio;
        
        const geometry = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
            roughness: 0.2
        });
        
        mikuPlane = new THREE.Mesh(geometry, material);
        mikuPlane.position.set(-3, height/2, -3);
        mikuPlane.rotation.y = Math.PI/4;
        mikuPlane.castShadow = true;
        scene.add(mikuPlane);
    } catch (err) {
        console.warn('Miku贴图加载失败，使用默认材质');
        const geometry = new THREE.PlaneGeometry(2, 3);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xFF69B4,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });
        mikuPlane = new THREE.Mesh(geometry, material);
        mikuPlane.position.set(-3, 1.5, -3);
        scene.add(mikuPlane);
    }
}

async function initBoxes() {
    try {
        boxes = [];
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        
        const textureLoader = new THREE.TextureLoader();
        const texture = await new Promise((resolve, reject) => {
            textureLoader.load('csj.jpg', resolve, undefined, reject);
        });
        
        texture.encoding = THREE.sRGBEncoding;
        const material = new THREE.MeshStandardMaterial({ 
            map: texture,
            roughness: 0.7
        });
        
        for (let i = 0; i < 5; i++) {
            const box = new THREE.Mesh(geometry, material.clone());
            box.position.set(i * 3 - 1.5, 0.5, 0);
            box.castShadow = true;
            box.receiveShadow = true;
            box.userData = { 
                velocity: new THREE.Vector3(),
                angularVelocity: 0,
                mass: PHYSICS.boxMass,
                isBox: true,
                size: new THREE.Vector3(1, 1, 1)
            };
            scene.add(box);
            boxes.push(box);
        }
        scene.add(new THREE.AxesHelper(5));
    } catch (err) {
        console.warn('方块贴图加载失败，使用默认材质');
        boxes = [];
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const materials = [
            new THREE.MeshStandardMaterial({ color: 0xff4444 }),
            new THREE.MeshStandardMaterial({ color: 0x44ff44 }),
            new THREE.MeshStandardMaterial({ color: 0x4444ff }),
            new THREE.MeshStandardMaterial({ color: 0xffff44 }),
            new THREE.MeshStandardMaterial({ color: 0xff44ff })
        ];
        
        for (let i = 0; i < 5; i++) {
            const box = new THREE.Mesh(geometry, materials[i]);
            box.position.set(i * 3 - 1.5, 0.5, 0);
            box.castShadow = true;
            box.userData = { 
                velocity: new THREE.Vector3(),
                angularVelocity: 0,
                mass: PHYSICS.boxMass,
                isBox: true,
                size: new THREE.Vector3(1, 1, 1)
            };
            scene.add(box);
            boxes.push(box);
        }
    }
}

async function initEarth() {
    return new Promise((resolve) => {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            'Earth.jpg',
            (earthTexture) => {
                const material = new THREE.MeshPhongMaterial({ map: earthTexture });
                earth = new THREE.Mesh(
                    new THREE.SphereGeometry(5, 32, 32),
                    material
                );
                earth.position.set(15, 5, -5);
                scene.add(earth);
                resolve();
            },
            undefined,
            (err) => {
                console.error("地球贴图加载失败");
                earth = new THREE.Mesh(
                    new THREE.SphereGeometry(5, 32, 32),
                    new THREE.MeshBasicMaterial({ color: 0x4488ff })
                );
                earth.position.set(15, 5, -5);
                scene.add(earth);
                resolve();
            }
        );
    });
}

async function initBoulder() {
    return new Promise((resolve) => {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            'boulder.jpg',
            (boulderTexture) => {
                const material = new THREE.MeshPhongMaterial({ map: boulderTexture });
                boulder = new THREE.Mesh(
                    new THREE.SphereGeometry(PHYSICS.boulderRadius, 32, 32),
                    material
                );
                boulder.position.set(0, PHYSICS.boulderRadius, -PHYSICS.hillRadius);
                boulder.userData = {
                    velocity: new THREE.Vector3(),
                    angularVelocity: new THREE.Vector3(),
                    mass: PHYSICS.boulderMass,
                    isBoulder: true,
                    size: new THREE.Vector3(PHYSICS.boulderRadius * 2, PHYSICS.boulderRadius * 2, PHYSICS.boulderRadius * 2)
                };
                scene.add(boulder);
                resolve();
            },
            undefined,
            (err) => {
                console.error("巨石贴图加载失败");
                boulder = new THREE.Mesh(
                    new THREE.SphereGeometry(PHYSICS.boulderRadius, 32, 32),
                    new THREE.MeshBasicMaterial({ color: 0x888888 })
                );
                boulder.position.set(0, PHYSICS.boulderRadius, -PHYSICS.hillRadius);
                boulder.userData = {
                    velocity: new THREE.Vector3(),
                    angularVelocity: new THREE.Vector3(),
                    mass: PHYSICS.boulderMass,
                    isBoulder: true,
                    size: new THREE.Vector3(PHYSICS.boulderRadius * 2, PHYSICS.boulderRadius * 2, PHYSICS.boulderRadius * 2)
                };
                scene.add(boulder);
                resolve();
            }
        );
    });
}

function initPlayer() {
    player = {
        position: new THREE.Vector3(0, 1.6, 0),
        rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
        moveSpeed: 0.15,
        controls: { 
            forward: false, 
            backward: false, 
            left: false, 
            right: false 
        },
        size: new THREE.Vector3(PHYSICS.playerRadius * 2, PHYSICS.playerHeight, PHYSICS.playerRadius * 2)
    };
}

function setupControls() {
    const setControl = (key, state) => {
        const btn = document.getElementById(`btn-${key.toLowerCase()}`);
        if (btn) btn.classList.toggle('active', state);
        player.controls[key] = state;
    };

    const buttons = { 'w': 'forward', 'a': 'left', 's': 'backward', 'd': 'right' };
    
    Object.entries(buttons).forEach(([key, control]) => {
        const btn = document.getElementById(`btn-${key}`);
        if (!btn) return;
        
        const activate = () => setControl(control, true);
        const deactivate = () => setControl(control, false);
        
        btn.addEventListener('touchstart', activate, { passive: true });
        btn.addEventListener('touchend', deactivate);
        btn.addEventListener('mousedown', activate);
    });
    
    window.addEventListener('mouseup', () => {
        Object.values(buttons).forEach(control => setControl(control, false));
    });
    
    // 键盘控制
    const onKeyDown = (event) => {
        switch(event.key.toLowerCase()) {
            case 'w': setControl('forward', true); break;
            case 'a': setControl('left', true); break;
            case 's': setControl('backward', true); break;
            case 'd': setControl('right', true); break;
        }
    };
    
    const onKeyUp = (event) => {
        switch(event.key.toLowerCase()) {
            case 'w': setControl('forward', false); break;
            case 'a': setControl('left', false); break;
            case 's': setControl('backward', false); break;
            case 'd': setControl('right', false); break;
        }
    };
    
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    
    // 视角控制
    let isRotating = false;
    let lastTouch = { x: 0, y: 0 };
    
    const startRotate = (x, y) => {
        isRotating = true;
        lastTouch = { x, y };
    };
    
    const endRotate = () => isRotating = false;
    
    const handleRotate = (x, y) => {
        if (!isRotating) return;
        const deltaX = x - lastTouch.x;
        const deltaY = y - lastTouch.y;
        player.rotation.y -= deltaX * 0.002;
        player.rotation.x = Math.max(-Math.PI/3, Math.min(Math.PI/3, 
            player.rotation.x - deltaY * 0.002));
        lastTouch = { x, y };
    };
    
    renderer.domElement.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) startRotate(e.touches[0].clientX, e.touches[0].clientY);
    });
    
    renderer.domElement.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) handleRotate(e.touches[0].clientX, e.touches[0].clientY);
    });
    
    renderer.domElement.addEventListener('touchend', endRotate);
    renderer.domElement.addEventListener('mousedown', (e) => startRotate(e.clientX, e.clientY));
    renderer.domElement.addEventListener('mousemove', (e) => handleRotate(e.clientX, e.clientY));
    window.addEventListener('mouseup', endRotate);
}

function updatePlayerPosition() {
    const moveDirection = new THREE.Vector3();
    
    if (player.controls.forward) moveDirection.z -= 1;
    if (player.controls.backward) moveDirection.z += 1;
    if (player.controls.left) moveDirection.x -= 1;
    if (player.controls.right) moveDirection.x += 1;
    
    if (moveDirection.length() > 0) {
        moveDirection.normalize();
        moveDirection.multiplyScalar(player.moveSpeed);
        moveDirection.applyEuler(new THREE.Euler(0, player.rotation.y, 0));
        player.position.add(moveDirection);
        
        // 边界检查
        player.position.x = THREE.MathUtils.clamp(player.position.x, -45, 45);
        player.position.z = THREE.MathUtils.clamp(player.position.z, -45, 45);
    }
}

function updatePhysics() {
    // 方块物理
    boxes.forEach(box => {
        box.userData.velocity.y += PHYSICS.gravity;
        box.position.add(box.userData.velocity);
        box.rotation.y += box.userData.angularVelocity;
        
        if (box.position.y < 0.5) {
            box.position.y = 0.5;
            box.userData.velocity.y *= -PHYSICS.elasticity;
            box.userData.velocity.x *= PHYSICS.friction;
            box.userData.velocity.z *= PHYSICS.friction;
        }
        
        box.userData.angularVelocity *= PHYSICS.angularFriction;
        box.userData.velocity.multiplyScalar(0.95);
    });
    
    // 巨石物理
    if (boulder) {
        boulder.userData.velocity.y += PHYSICS.gravity;
        boulder.userData.velocity.multiplyScalar(PHYSICS.boulderFriction);
        boulder.userData.angularVelocity.multiplyScalar(PHYSICS.angularFriction);
        boulder.position.add(boulder.userData.velocity);
        boulder.rotation.y += boulder.userData.angularVelocity.y;
        
        if (boulder.position.z > 0) {
            boulder.position.set(0, PHYSICS.boulderRadius, -PHYSICS.hillRadius);
            boulder.userData.velocity.set(0, 0, 0);
            boulder.userData.angularVelocity.set(0, 0, 0);
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    if (earth) earth.rotation.y += 0.005;
    
    updatePhysics();
    updatePlayerPosition();
    
    camera.position.copy(player.position);
    camera.quaternion.setFromEuler(player.rotation);
    
    renderer.render(scene, camera);
    
    document.getElementById('debug').textContent = 
        `位置: X${player.position.x.toFixed(1)} Y${player.position.y.toFixed(1)} Z${player.position.z.toFixed(1)}`;
}

function handleError(err) {
    document.getElementById('debug').textContent = `错误: ${err.message}`;
    alert(`错误: ${err.message}`);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 启动场景
init();

