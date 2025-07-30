// 全局变量
let scene, camera, renderer, ground, boxes, player, mikuPlane, earth, boulder;

// 物理参数配置
const PHYSICS = {
    gravity: -0.02,
    playerRadius: 0.5,
    boxSize: 1.0,
    pushForce: 0.25,
    friction: 0.9,
    angularFriction: 0.95, // 旋转摩擦系数
    elasticity: 0.5,
    collisionEpsilon: 0.01,
    maxCollisionIterations: 5,
    playerHeight: 1.8,
    torqueMultiplier: 0.05,
    // 扭矩系数，控制旋转强度
    boxMass: 1.0,          // 方块质量
    boxInertia: 1,         // 方块转动惯量
    boulderMass: 5.0,      // 巨石质量
    boulderRadius: 1.5,    // 巨石半径
    boulderFriction: 0.7,  // 巨石摩擦系数
    hillHeight: 10,        // 山的高度
    hillRadius: 20         // 山的半径
};

/*


// 初始化巨石
async function initBoulder() {
    return new Promise((resolve) => {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            'boulder.jpg', // 假设存在巨石纹理
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
                console.error("巨石贴图加载失败:", err);
                // 失败时使用默认材质
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

// 玩家与巨石的碰撞检测和响应
function checkBoulderCollision(playerPos, playerSize, boulder) {
    const boulderPos = boulder.position;
    const boulderRadius = PHYSICS.boulderRadius;
    
    // 计算玩家底部Y坐标 (玩家中心点减去高度的一半)
    const playerBottomY = playerPos.y - playerSize.y / 2;
    // 计算巨石顶部Y坐标 (巨石中心点加上半径)
    const boulderTopY = boulderPos.y + boulderRadius;
    
    // 如果玩家底部高于巨石顶部，
    //或者玩家顶部低于巨石底部，则不会碰撞
    if (playerBottomY > boulderTopY || playerPos.y + playerSize.y / 2 < boulderPos.y - boulderRadius) {
        return null;
    }
    
    // 计算玩家与巨石在XZ平面上的距离
    const distXZ = Math.sqrt(Math.pow(playerPos.x - boulderPos.x, 2) + Math.pow(playerPos.z - boulderPos.z, 2));
    
    // 如果距离大于玩家半径与巨石半径之和，则无碰撞
    if (distXZ > playerSize.x / 2 + boulderRadius) {
        return null;
    }
    
    // 计算碰撞法线
    const normal = new THREE.Vector3(playerPos.x - boulderPos.x, 0, playerPos.z - boulderPos.z).normalize();
    
    // 计算碰撞深度
    const depth = playerSize.x / 2 + boulderRadius - distXZ;
    
    // 计算碰撞点
    const collisionPoint = new THREE.Vector3(
        boulderPos.x + normal.x * boulderRadius,
        boulderPos.y,
        boulderPos.z + normal.z * boulderRadius
    );
    
    return {
        normal,
        depth,
        boulder: boulder,
        collisionPoint: collisionPoint,
        isHorizontal: true
    };
}

// 处理玩家与巨石的碰撞
function handleBoulderCollision(newPosition, moveDirection) {
    let resolvedPosition = newPosition.clone();
    let collisionOccurred = false;
    
    const collision = checkBoulderCollision(resolvedPosition, player.size, boulder);
    if (collision) {
        collisionOccurred = true;
        
        // 计算推力方向 - 基于玩家移动方向和碰撞法线
        const pushDir = new THREE.Vector3().copy(collision.normal).negate();
        
        // 仅在有移动方向时施加推力
        if (moveDirection.length() > 0) {
            // 计算移动方向与碰撞法线的点积，决定推力大小
            const dotProduct = Math.max(0, -moveDirection.dot(collision.normal));
            const force = PHYSICS.pushForce * player.moveSpeed * dotProduct;
            
            // 应用推力
            boulder.userData.velocity.add(pushDir.multiplyScalar(force));
            
            // 计算水平扭矩（仅影响Y轴旋转）
            const forceArm = new THREE.Vector3();
            forceArm.subVectors(collision.collisionPoint, boulder.position);
            forceArm.y = 0; // 仅考虑水平面内的力臂
            
            // 计算扭矩大小（简化版）
            // 扭矩 = 力臂 × 力 × 垂直分量
            const torque = forceArm.length() * force * PHYSICS.torqueMultiplier;
            
            // 确定扭矩方向（使用叉乘的Y分量符号）
            const torqueDirection = Math.sign(forceArm.x * pushDir.z - forceArm.z * pushDir.x);
            
            // 应用扭矩到角速度（考虑转动惯量）
            boulder.userData.angularVelocity.y += (torque * torqueDirection) / (PHYSICS.boulderMass * PHYSICS.boulderRadius * PHYSICS.boulderRadius / 2);
        }
        
        // 解决碰撞
        resolvedPosition.add(pushDir.multiplyScalar(collision.depth));
    }
    
    return {
        resolvedPosition,
        collisionOccurred
    };
}

// 更新巨石的位置和旋转
function updateBoulder() {
    if (boulder) {
        // 应用重力
        boulder.userData.velocity.y += PHYSICS.gravity;
        
        // 应用摩擦力
        boulder.userData.velocity.multiplyScalar(PHYSICS.boulderFriction);
        boulder.userData.angularVelocity.multiplyScalar(PHYSICS.angularFriction);
        
        // 更新位置
        boulder.position.add(boulder.userData.velocity);
        
        // 更新旋转
        boulder.rotation.y += boulder.userData.angularVelocity.y;
        
        // 检查巨石是否滚回山脚
        if (boulder.position.z > 0) {
            boulder.position.set(0, PHYSICS.boulderRadius, -PHYSICS.hillRadius);
            boulder.userData.velocity.set(0, 0, 0);
            boulder.userData.angularVelocity.set(0, 0, 0);
        }
    }
}

// 动画循环
function animate() {
    requestAnimationFrame(animate);
    
    // 更新玩家位置
    updatePlayer();
    
    // 更新巨石位置和旋转
    updateBoulder();
    
    // 渲染场景
    renderer.render(scene, camera);
}

// 更新玩家位置
function updatePlayer() {
    const moveDirection = new THREE.Vector3();
    
    if (player.controls.forward) {
        moveDirection.z -= 1;
    }
    if (player.controls.backward) {
        moveDirection.z += 1;
    }
    if (player.controls.left) {
        moveDirection.x -= 1;
    }
    if (player.controls.right) {
        moveDirection.x += 1;
    }
    
    moveDirection.normalize().multiplyScalar(player.moveSpeed);
    
    // 应用玩家旋转
    moveDirection.applyEuler(player.rotation);
    
    const newPosition = player.position.clone().add(moveDirection);
    
    // 处理与方块的碰撞
    const { resolvedPosition: blockResolvedPosition, collisionOccurred: blockCollisionOccurred } = handleCollisions(newPosition, moveDirection);
    
    // 处理与巨石的碰撞
    const { resolvedPosition: boulderResolvedPosition, collisionOccurred: boulderCollisionOccurred } = handleBoulderCollision(blockResolvedPosition, moveDirection);
    
    player.position.copy(boulderResolvedPosition);
    
    // 更新相机位置
    camera.position.copy(player.position);
    camera.rotation.copy(player.rotation);
    camera.position.y += 1.6;
    camera.lookAt(player.position.x, player.position.y + 1.6, player.position.z);
}

// 原有的函数保持不变...

// 调用初始化函数
/*
// 渲染参数面板（实时更新）
function renderParams() {
    const container = document.getElementById('physics-params');
    container.innerHTML = '';
    
    Object.entries(PHYSICS).forEach(([key, value]) => {
        const inputId = `param-${key}`;
        container.innerHTML += `
            <div style="font-weight:bold">${key}</div>
            <input type="number" step="0.01" value="${value}" id="${inputId}"
                   style="width:100%;padding:3px;border:1px solid #ddd;border-radius:2px;"
                   oninput="PHYSICS['${key}'] = parseFloat(this.value)">
        `;
    });
}

// 切换面板显示
document.getElementById('toggle-btn').addEventListener('click', () => {
    const panel = document.getElementById('physics-panel');
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
});

// 初始化渲染
renderParams();


*/









// 初始化函数
async function init() {
    try {
        // 1. 初始化场景
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xF0F8FF);
        
        // 2. 初始化相机
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 1.6, 3);
        camera.lookAt(0, 1.6, 0);
        
        // 3. 初始化渲染器
        initRenderer();
        
        // 4. 添加光源
        initLights();
        
        // 5. 并行加载资源
        await Promise.all([
            initGround('grass.jpg'),
            initMikuPlane(),
            initBoxes(),


//            initTest1(),
            initTest2(),
            initTest5(),
//            initTest3()
        ]);
        
        // 6. 初始化玩家
        initPlayer();
        
        // 7. 设置控制
        setupControls();
        
        // 8. 开始动画循环
        animate();
        
//        document.getElementById('debug').textContent = "场景加载完成！移动: WASD 或屏幕按钮";
    } catch (err) {
        handleError(err);
    }
}

//////////////////////////////////////

function initTest1() {
    return new Promise((resolve, reject) => {
        // 1. 创建GLTF加载器
        const loader = new THREE.GLTFLoader();
        
        loader.load(
            'tWing.glb', 
            (gltf) => {
                // 2. 获取模型场景
                const model = gltf.scene;
                
                // 3. 调整模型位置和缩放
                model.position.set(0, 10, -15);
                model.scale.set(1, 1, 1); // 可根据需要调整

                // 4. 遍历模型所有子网格，优化材质和法线
                model.traverse((child) => {
                    if (child.isMesh) {
                        // 确保材质兼容性
                        if (child.material.isMeshStandardMaterial) {
                            child.material.metalness = 0.2;  // 减少金属感
                            child.material.roughness = 0.8;  // 增加粗糙度
                            child.material.envMapIntensity = 1; // 环境贴图强度
                        }

                        // 强制重新计算法线（解决光照黑块问题）
                        if (child.geometry) {
                            child.geometry.computeVertexNormals();
                        }

                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                // 5. 添加到场景
                scene.add(model);
                console.log('tWing.glb 模型加载成功，已优化材质和光照');

                // 6. 返回模型对象以便后续控制
                resolve(model);
            },
            undefined, // 不需要进度回调
            (error) => {
                console.error('模型加载失败:', error);
                
                // 失败时创建一个替代的红色立方体（用于调试）
                const fallbackGeometry = new THREE.BoxGeometry(1, 1, 1);
                const fallbackMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                const fallbackModel = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
                fallbackModel.position.set(1, 1, 1);
                scene.add(fallbackModel);
                
                resolve(fallbackModel); // 仍然返回一个可用的模型
            }
        );
    });
}





async function initTest5() {
    return new Promise((resolve) => {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            'Earth.jpg',
            (earthTexture) => {
                const material = new THREE.MeshPhongMaterial({ map: earthTexture });
                earth = new THREE.Mesh( // 将地球赋值给全局变量
                    new THREE.SphereGeometry(5, 32, 32),
                    material
                );
                earth.position.set(15, 5, -5);
                scene.add(earth);
                resolve();
            },
            undefined,
            (err) => {
                console.error("贴图加载失败:", err);
                // 失败时使用默认材质
                earth = new THREE.Mesh(
                    new THREE.SphereGeometry(5, 32, 32),
                    new THREE.MeshBasicMaterial({ color: 0x4488ff })
                );
                //earth.position.set(10, 20, 0);
                scene.add(earth);
                resolve();
            }
        );
    });
}

/*

function initTest1() {
    return new Promise((resolve) => {
        const loader = new GLTFLoader();
        loader.load(
            'engine.glb', // 直接使用同级路径
            (gltf) => {
                const model = gltf.scene;
                model.position.set(3, 1, 3);
                scene.add(model);
                console.log('模型加载成功');
                resolve();
            },
            undefined,
            (error) => {
                console.error('模型加载失败:', error);
                resolve();
            }
        );
    });
}

*/

async function initTest2() {
    try {
        // 创建平面几何体（宽50，高50）
        const geometry = new THREE.PlaneGeometry(50, 50);
        let material;
        try {
            const texture = await new THREE.TextureLoader().loadAsync('ruGuoNe.jpg');
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(1, 1); // 贴图重复次数（可根据需要调整）
            material = new THREE.MeshStandardMaterial({ 
                map: texture,
                side: THREE.DoubleSide, // 双面显示
                roughness: 0.7
            });
        } catch (err) {
            console.warn('贴图加载失败，使用默认材质', err);
            material = new THREE.MeshStandardMaterial({ 
                color: 0x4488ff,
                side: THREE.DoubleSide
            });
        }
        
        // 创建平面网格
        const plane = new THREE.Mesh(geometry, material);
        
        // 设置位置和旋转
        plane.position.set(0, 25, -50);
        //plane.rotation.y = Math.PI / 2; // 绕Y轴旋转90度使其竖立
        
        // 可选：添加边框
        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })
        );
        plane.add(line);
        
        scene.add(plane);
//        console.log('竖立平面已创建于 (3, 25, 3)');
    } catch (err) {
        console.error('initTest2出错:', err);
    }
}


/*


function initTest3() {
    // 迷宫参数
    const mazePosition = new THREE.Vector3(0, 0, -20); // 调整Y坐标为0，使地板在地面
    const mazeHeight = 10;
    const mazeSize = 20;
    const wallThickness = 0.5; // 减小墙壁厚度
    
    // 创建迷宫墙壁材质
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x888888,
        roughness: 0.7,
        metalness: 0.3
    });



    const mazeLayout = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,1],
    [1,0,1,1,0,1,0,1,1,1,1,1,1,0,1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,1],
    [1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,0,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,0,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,1,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];






    const rows = mazeLayout.length;
    const cols = mazeLayout[0].length;
    const cellSize = mazeSize / Math.max(rows, cols);

    // 先添加地板（作为参考基准）
    const floorGeometry = new THREE.BoxGeometry(mazeSize, 0.5, mazeSize);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.copy(mazePosition);
    floor.position.y -= 0.25; // 地板厚度0.5，所以下移0.25使其顶部在地面
    scene.add(floor);

    // 创建水平墙壁（沿Z轴方向）
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols - 1; j++) {
            if (mazeLayout[i][j] === 1 && mazeLayout[i][j + 1] === 1) {
                const wallGeometry = new THREE.BoxGeometry(
                    cellSize, 
                    mazeHeight, 
                    wallThickness
                );
                
                const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                
                // 计算墙壁位置
                wall.position.x = mazePosition.x + (j - cols/2 + 1) * cellSize;
                wall.position.y = mazePosition.y + mazeHeight/2;
                wall.position.z = mazePosition.z + (i - rows/2 + 0.5) * cellSize;
                
                scene.add(wall);
            }
        }
    }

    // 创建垂直墙壁（沿X轴方向）
    for (let i = 0; i < rows - 1; i++) {
        for (let j = 0; j < cols; j++) {
            if (mazeLayout[i][j] === 1 && mazeLayout[i + 1][j] === 1) {
                const wallGeometry = new THREE.BoxGeometry(
                    wallThickness, 
                    mazeHeight, 
                    cellSize
                );
                
                const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                
                // 计算墙壁位置
                wall.position.x = mazePosition.x + (j - cols/2 + 0.5) * cellSize;
                wall.position.y = mazePosition.y + mazeHeight/2;
                wall.position.z = mazePosition.z + (i - rows/2 + 1) * cellSize;
                
                scene.add(wall);
            }
        }
    }

    // 添加四周边界墙
//    addBoundaryWalls(mazePosition, mazeSize, mazeHeight, wallThickness, wallMaterial);
}

// 添加迷宫边界墙
function addBoundaryWalls(position, size, height, thickness, material) {
    const halfSize = size / 2;
    
    // 左右墙
    for (let z = -1; z <= 1; z += 2) {
        const wallGeometry = new THREE.BoxGeometry(size, height, thickness);
        const wall = new THREE.Mesh(wallGeometry, material);
        wall.position.set(
            position.x,
            position.y + height/2,
            position.z + z * halfSize
        );
        scene.add(wall);
    }
    
    // 前后墙
    for (let x = -1; x <= 1; x += 2) {
        const wallGeometry = new THREE.BoxGeometry(thickness, height, size);
        const wall = new THREE.Mesh(wallGeometry, material);
        wall.position.set(
            position.x + x * halfSize,
            position.y + height/2,
            position.z
        );
        scene.add(wall);
    }
}





function initTest4() {
    // 山路参数配置
    const MOUNTAIN = {
        width: 10,          // 基础路径宽度
        segmentLength: 5,   // 每段长度
        segments: 200,      // 总段数
        heightVariation: 15, // 高度变化幅度
        curvature: 0.2,     // 弯曲程度
        roughness: 0.3      // 路面粗糙度
    };

    // 创建路径容器组
    const pathGroup = new THREE.Group();
    pathGroup.name = "mountain_path";
    
    // 1. 生成路径几何体
    const pathGeometry = new THREE.BufferGeometry();
    const vertices = [];
    const uvs = [];
    const indices = [];
    
    // 使用柏林噪声生成自然曲线
    const noise = new SimplexNoise();
    let lastY = 0;
    let lastZ = 0;
    
    for(let i = 0; i <= MOUNTAIN.segments; i++) {
        const t = i / MOUNTAIN.segments;
        const x = i * MOUNTAIN.segmentLength;
        
        // 使用噪声生成高度和弯曲
        const y = noise.noise2D(x * 0.1, 0) * MOUNTAIN.heightVariation;
        const z = noise.noise2D(x * 0.05, 100) * MOUNTAIN.curvature * 10;
        
        // 添加两侧顶点
        for(let side = -1; side <= 1; side += 2) {
            vertices.push(
                x, 
                y + (noise.noise2D(x * 0.3, side * 100) * MOUNTAIN.roughness,
                z + side * MOUNTAIN.width / 2
            );
            uvs.push(i / 20, (side + 1) / 2);
        }
        
        // 构建三角形索引
        if(i > 0) {
            const a = (i-1)*2;
            const b = (i-1)*2+1;
            const c = i*2;
            const d = i*2+1;
            indices.push(a, b, d, a, d, c);
        }
        
        lastY = y;
        lastZ = z;
    }
    
    // 设置几何体属性
    pathGeometry.setIndex(indices);
    pathGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    pathGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    pathGeometry.computeVertexNormals();
    
    // 2. 创建路面材质
    const pathTexture = new THREE.TextureLoader().load('assets/rocky_path.jpg');
    pathTexture.wrapS = pathTexture.wrapT = THREE.RepeatWrapping;
    pathTexture.repeat.set(10, 1);
    
    const pathMaterial = new THREE.MeshStandardMaterial({
        map: pathTexture,
        normalMap: new THREE.TextureLoader().load('assets/rocky_normal.jpg'),
        roughness: 0.8,
        metalness: 0.1,
        side: THREE.DoubleSide
    });
    
    const pathMesh = new THREE.Mesh(pathGeometry, pathMaterial);
    pathMesh.receiveShadow = true;
    pathMesh.castShadow = true;
    pathGroup.add(pathMesh);
    
    // 3. 添加路缘石
    const curbGeometry = new THREE.BufferGeometry();
    const curbVertices = [];
    
    for(let i = 0; i <= MOUNTAIN.segments; i++) {
        const x = i * MOUNTAIN.segmentLength;
        const y = vertices[i*4 + 1]; // 获取对应Y坐标
        const z = vertices[i*4 + 2]; // 获取对应Z坐标
        
        // 两侧路缘石
        for(let side = -1; side <= 1; side += 2) {
            const baseZ = z + side * MOUNTAIN.width/2;
            curbVertices.push(x, y, baseZ);
            curbVertices.push(x, y + 0.3, baseZ);
        }
    }
    
    curbGeometry.setAttribute('position', new THREE.Float32BufferAttribute(curbVertices, 3));
    
    // 创建路缘石线框
    const curbLines = new THREE.LineSegments(
        curbGeometry,
        new THREE.LineBasicMaterial({ color: 0xAAAAAA, linewidth: 2 })
    );
    pathGroup.add(curbLines);
    
    // 4. 添加随机障碍物
    const obstacleTypes = [
        { geo: new THREE.BoxGeometry(1, 0.5, 1), color: 0x888888 }, // 石块
        { geo: new THREE.ConeGeometry(0.7, 1, 6), color: 0x339933 }, // 灌木
        { geo: new THREE.CylinderGeometry(0.3, 0.3, 1), color: 0xCCCC00 } // 木桩
    ];
    
    for(let i = 0; i < MOUNTAIN.segments; i += 5) {
        if(Math.random() > 0.6) continue; // 随机跳过部分
        
        const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        const obstacle = new THREE.Mesh(
            type.geo,
            new THREE.MeshStandardMaterial({ color: type.color })
        );
        
        const x = i * MOUNTAIN.segmentLength + (Math.random() - 0.5) * 3;
        const y = vertices[i*4 + 1] + 0.5;
        const z = vertices[i*4 + 2] + (Math.random() - 0.5) * (MOUNTAIN.width - 2);
        
        obstacle.position.set(x, y, z);
        obstacle.rotation.y = Math.random() * Math.PI;
        
        // 添加物理属性
        obstacle.userData = {
            isObstacle: true,
            size: new THREE.Vector3(1, 1, 1)
        };
        
        pathGroup.add(obstacle);
    }
    
    // 5. 设置路径物理属性
    pathGroup.userData = {
        isPath: true,
        checkCollision: (object) => {
            // 简化的路径碰撞检测
            const pos = object.position;
            const closestSegment = Math.floor(pos.x / MOUNTAIN.segmentLength);
            
            if(closestSegment >= 0 && closestSegment < MOUNTAIN.segments) {
                const idx = closestSegment * 4;
                const pathY = vertices[idx + 1];
                
                // 如果低于路径表面
                if(pos.y < pathY) {
                    object.position.y = pathY + 0.5; // 重置到表面
                    if(object.userData.velocity) {
                        object.userData.velocity.y = 0; // 清除垂直速度
                    }
                    return true;
                }
            }
            return false;
        }
    };
    
    scene.add(pathGroup);
    
    // 6. 添加环境标记
    createMilestones(pathGroup);
    
    return pathGroup;
}

// 辅助函数：创建里程碑标记
function createMilestones(pathGroup) {
    for(let i = 0; i < 5; i++) {
        const milestone = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.5, 2),
            new THREE.MeshPhongMaterial({ color: 0xFFFFFF })
        );
        
        const x = i * (MOUNTAIN.segments * MOUNTAIN.segmentLength / 5);
        const y = getTerrainHeightAt(x) + 1;
        
        milestone.position.set(x, y, 0);
        milestone.userData = {
            isMilestone: true,
            number: (i + 1) * 100
        };
        
        // 添加文字标签
        const text = createTextMesh(`${(i+1)*100}m`, 0.5);
        text.position.set(x, y + 1.5, 0);
        pathGroup.add(text);
        
        pathGroup.add(milestone);
    }
}

// 辅助函数：获取某点的地形高度
function getTerrainHeightAt(x) {
    const segment = Math.floor(x / MOUNTAIN.segmentLength);
    if(segment < 0 || segment >= MOUNTAIN.segments) return 0;
    
    const t = (x % MOUNTAIN.segmentLength) / MOUNTAIN.segmentLength;
    const idx = segment * 4;
    const y1 = vertices[idx + 1];
    const y2 = vertices[idx + 5];
    
    return y1 + (y2 - y1) * t;
}



*/
















///////////////////////////////////////


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
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
}

async function initGround(texturePath) {
    try {
        const texture = await new THREE.TextureLoader().loadAsync(texturePath);
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
        throw new Error(`地面加载失败: ${err.message}`);
    }
}

async function initMikuPlane() {
    try {
        const texture = await new THREE.TextureLoader().loadAsync('miku.jpg');
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
        mikuPlane.receiveShadow = true;
        
        // 添加边框
        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })
        );
        mikuPlane.add(line);
        
        scene.add(mikuPlane);
    } catch (err) {
        console.warn(`Miku加载失败: ${err.message}, 使用替代方案`);
        
        const geometry = new THREE.PlaneGeometry(2, 3);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xFF69B4,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });
        
        mikuPlane = new THREE.Mesh(geometry, material);
        ///
        //mikuPlane.position.set(100000, 1.5, -3);
        ///
        scene.add(mikuPlane);
    }
}

async function initBoxes() {
    try {
        boxes = [];
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        
        let material;
        try {
            const texture = await new THREE.TextureLoader().loadAsync('csj.jpg');
            texture.encoding = THREE.sRGBEncoding;
            material = new THREE.MeshStandardMaterial({ 
                map: texture,
                roughness: 0.7
            });
        } catch {
            material = new THREE.MeshStandardMaterial({ 
                color: 0x4488ff,
                roughness: 0.7
            });
        }
        
        for (let i = 0; i < 5; i++) {
            const box = new THREE.Mesh(geometry, material.clone());
            box.position.set(i * 3 - 1.5, 0.5, 0);
            box.castShadow = true;
            box.receiveShadow = true;
            box.userData = { 
                velocity: new THREE.Vector3(),
                angularVelocity: 0, // 改为标量，仅用于绕Y轴旋转
                mass: PHYSICS.boxMass,
                isBox: true,
                size: new THREE.Vector3(1, 1, 1)
            };
            scene.add(box);
            boxes.push(box);
        }
        
        // 添加坐标轴辅助
        scene.add(new THREE.AxesHelper(5));
    } catch (err) {
        throw new Error(`方块初始化失败: ${err.message}`);
    }
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
        btn.addEventListener('touchcancel', deactivate);
        btn.addEventListener('mousedown', activate);
    });
    
    window.addEventListener('mouseup', () => {
        Object.values(buttons).forEach(control => setControl(control, false));
    });
    
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
    
    // 触摸控制
    renderer.domElement.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) startRotate(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    
    renderer.domElement.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) handleRotate(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    
    renderer.domElement.addEventListener('touchend', endRotate);
    
    // 鼠标控制
    renderer.domElement.addEventListener('mousedown', (e) => {
        startRotate(e.clientX, e.clientY);
    });
    
    renderer.domElement.addEventListener('mousemove', (e) => {
        handleRotate(e.clientX, e.clientY);
    });
    
    window.addEventListener('mouseup', endRotate);
}

// 玩家与方块的碰撞检测和响应 - 全方位版本
function checkCollision(playerPos, playerSize, box) {
    const boxPos = box.position;
    const boxSize = box.userData.size;
    
    // 计算玩家底部Y坐标 (玩家中心点减去高度的一半)
    const playerBottomY = playerPos.y - playerSize.y / 2;
    // 计算方块顶部Y坐标 (方块中心点加上高度的一半)
    const boxTopY = boxPos.y + boxSize.y / 2;
    
    // 如果玩家底部高于方块顶部，
    //或者玩家顶部低于方块底部，则不会碰撞
    if (playerBottomY > boxTopY || playerPos.y + playerSize.y / 2 < boxPos.y - boxSize.y / 2) {
        return null;
    }
    
    // 计算两个立方体在各轴上的距离
    const distX = Math.abs(playerPos.x - boxPos.x);
    const distY = Math.abs(playerPos.y - boxPos.y);
    const distZ = Math.abs(playerPos.z - boxPos.z);
    
    // 计算两个立方体在各轴上的半宽之和
    const halfWidthsX = (playerSize.x + boxSize.x) / 2;
    const halfWidthsY = (playerSize.y + boxSize.y) / 2;
    const halfWidthsZ = (playerSize.z + boxSize.z) / 2;
    
    // 如果在任一轴上距离大于半宽之和，则无碰撞
    if (distX > halfWidthsX || distZ > halfWidthsZ) {
        return null;
    }
    
    // 计算各轴上的重叠量
    const overlapX = halfWidthsX - distX;
    const overlapY = halfWidthsY - distY;
    const overlapZ = halfWidthsZ - distZ;
    
    // 找出最小重叠轴
    let minOverlap = Math.min(overlapX, overlapZ);
    let normal = new THREE.Vector3();
    
    if (minOverlap === overlapX) {
        // X轴是最小重叠轴
        normal.x = playerPos.x < boxPos.x ? -1 : 1;
        minOverlap += PHYSICS.collisionEpsilon;
    } else {
        // Z轴是最小重叠轴
        normal.z = playerPos.z < boxPos.z ? -1 : 1;
        minOverlap += PHYSICS.collisionEpsilon;
    }
    
    // 计算碰撞点（更精确的版本）
    const collisionPoint = new THREE.Vector3(
        playerPos.x + normal.x * playerSize.x / 2,
        boxPos.y,  // 碰撞点高度设为方块中心高度
        playerPos.z + normal.z * playerSize.z / 2
    );
    
    return {
        normal,
        depth: minOverlap,
        box: box,
        collisionPoint: collisionPoint,
        isHorizontal: true
    };
}

// 处理所有碰撞并迭代解决 - 仅水平旋转
function handleCollisions(newPosition, moveDirection) {
    let resolvedPosition = newPosition.clone();
    let collisionOccurred = false;
    
    // 进行多次迭代，确保解决所有碰撞
    for (let i = 0; i < PHYSICS.maxCollisionIterations; i++) {
        let hasCollision = false;
        let deepestCollision = null;
        
        // 检查与所有方块的碰撞
        boxes.forEach(box => {
            const collision = checkCollision(resolvedPosition, player.size, box);
            if (collision) {
                hasCollision = true;
                collisionOccurred = true;
                
                // 找到最深的碰撞
                if (!deepestCollision || collision.depth > deepestCollision.depth) {
                    deepestCollision = collision;
                }
            }
        });
        
        // 如果没有碰撞，退出迭代
        if (!hasCollision) break;
        
        // 解决最深的碰撞
        if (deepestCollision) {
            // 计算推力方向 - 基于玩家移动方向和碰撞法线
            const pushDir = new THREE.Vector3().copy(deepestCollision.normal).negate();
            
            // 仅在有移动方向时施加推力
            if (moveDirection.length() > 0) {
                // 计算移动方向与碰撞法线的点积，决定推力大小
                const dotProduct = Math.max(0, -moveDirection.dot(deepestCollision.normal));
                const force = PHYSICS.pushForce * player.moveSpeed * dotProduct;
                
                // 应用推力
                deepestCollision.box.userData.velocity.add(pushDir.multiplyScalar(force));
                
                // 计算水平扭矩（仅影响Y轴旋转）
                const forceArm = new THREE.Vector3();
                forceArm.subVectors(deepestCollision.collisionPoint, deepestCollision.box.position);
                forceArm.y = 0; // 仅考虑水平面内的力臂
                
                // 计算扭矩大小（简化版）
                // 扭矩 = 力臂 × 力 × 垂直分量
                const torque = forceArm.length() * force * PHYSICS.torqueMultiplier;
                
                // 确定扭矩方向（使用叉乘的Y分量符号）
                const torqueDirection = Math.sign(forceArm.x * pushDir.z - forceArm.z * pushDir.x);
                
                // 应用扭矩到角速度（考虑转动惯量）
                deepestCollision.box.userData.angularVelocity += (torque * torqueDirection) / PHYSICS.boxInertia;
            }
            
            // 分离玩家位置
            const separation = new THREE.Vector3()
                .copy(deepestCollision.normal)
                .multiplyScalar(deepestCollision.depth);
                
            resolvedPosition.add(separation);
        }
    }
    
    return {
        position: resolvedPosition,
        collisionOccurred: collisionOccurred
    };
}

function updatePhysics() {
    // 计算移动方向
    const moveDirection = new THREE.Vector3();
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(player.rotation);
    const right = new THREE.Vector3(1, 0, 0).applyEuler(player.rotation);
    
    forward.y = 0;
    right.y = 0;
    forward.normalize();
    right.normalize();
    
    if (player.controls.forward) moveDirection.add(forward);
    if (player.controls.backward) moveDirection.sub(forward);
    if (player.controls.right) moveDirection.add(right);
    if (player.controls.left) moveDirection.sub(right);
    
    // 更新方块物理（包括旋转）
    boxes.forEach(box => {
        // 应用重力
        box.userData.velocity.y += PHYSICS.gravity;
        
        // 更新位置
        box.position.add(box.userData.velocity);
        
        // 应用旋转（仅绕Y轴）
        box.rotation.y += box.userData.angularVelocity;
        
        // 地面碰撞
        if (box.position.y < 0.5) {
            box.position.y = 0.5;
            box.userData.velocity.y *= -PHYSICS.elasticity;
            box.userData.velocity.x *= PHYSICS.friction;
            box.userData.velocity.z *= PHYSICS.friction;
        }
        
        // 应用旋转摩擦
        box.userData.angularVelocity *= PHYSICS.angularFriction;
        
        // 速度衰减
        box.userData.velocity.multiplyScalar(0.95);
    });
    
    // 玩家移动处理
    if (moveDirection.length() > 0) {
        const moveDistance = player.moveSpeed;
        const moveStep = moveDirection.clone().normalize().multiplyScalar(moveDistance);
        const newPosition = player.position.clone().add(moveStep);
        
        // 处理所有碰撞并获得解决后的位置
        const collisionResult = handleCollisions(newPosition, moveDirection);
        
        // 如果没有与Miku平面碰撞，则更新玩家位置
        if (!checkMikuCollision(collisionResult.position)) {
            player.position.copy(collisionResult.position);
        }
    }
}

function checkMikuCollision(position) {
    if (!mikuPlane) return false;
    
    const planeWidth = mikuPlane.geometry.parameters.width;
    const planePos = mikuPlane.position;
    
    return Math.abs(position.x - planePos.x) < planeWidth/2 + PHYSICS.playerRadius && 
           Math.abs(position.z - planePos.z) < 0.1 + PHYSICS.playerRadius;
}




function animate() {
    requestAnimationFrame(animate); // 只调用一次！

    // 地球旋转
    if (earth) earth.rotation.y += 0.005;

    // 更新物理（包括玩家位置）
    updatePhysics();

    // 同步相机到玩家位置和视角
    camera.position.copy(player.position);
    camera.quaternion.setFromEuler(player.rotation);

    // 渲染
    renderer.render(scene, camera);

    // 调试信息（可选）
    document.getElementById('debug').textContent = 
        `位置: X${player.position.x.toFixed(1)} Y${player.position.y.toFixed(1)} Z${player.position.z.toFixed(1)}\n` +
        `视角: 水平${(player.rotation.y * 180/Math.PI).toFixed(1)}° 垂直${(player.rotation.x * 180/Math.PI).toFixed(1)}°`;
}





function handleError(err) {
    const errorMsg = `错误: ${err.message}`;
    console.error(err);
    document.getElementById('debug').textContent = errorMsg;
    alert(errorMsg);
}

// 窗口大小调整
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 启动场景
init();
