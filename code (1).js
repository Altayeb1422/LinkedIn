document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration & State ---
    // !!! WARNING: EXPOSING API KEYS IN CLIENT-SIDE CODE IS A MAJOR SECURITY RISK !!!
    // Replace with your actual key ONLY for local testing. In production, use a backend proxy.
    const DEEPSEEK_API_KEY = 'sk-b3c1e3c20e8d49c59ce0ee794af9874c'; // USE WITH EXTREME CAUTION
    const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'; // Standard Chat API endpoint

    let appState = {
        currentPage: 'dashboard-page',
        generatedPosts: [], // { id: Date.now(), content: "...", suggestions: { headlines: [], images: [] }, status: 'new' }
        generatedBlogs: [], // { id: Date.now(), title: "...", outline: "...", content: "...", status: 'new' }
        scheduledItems: [], // { id: Date.now(), type: 'post'/'blog', content: "...", scheduleTime: Date ISO }
        settings: {
            productFocus: 'Smart Widgets, Eco-Friendly Packaging, AI Analytics Tool',
            companyInfo: 'A B2B company specializing in innovative tech solutions.',
            defaultTone: 'professional',
            theme: 'light' // 'light' or 'dark'
        },
        // Add more state as needed
    };

    // --- DOM Elements ---
    const navLinks = document.querySelectorAll('.nav-link');
    const mainContent = document.querySelector('.main-content');
    const pageSections = document.querySelectorAll('.page-section');
    const themeToggleButton = document.getElementById('theme-toggle-btn');
    const apiKeyDisplay = document.getElementById('api-key-display'); // Get the input element

    // --- Initialization ---
    function init() {
        loadState(); // Load from localStorage
        setupNavigation();
        setupEventListeners();
        applyTheme(appState.settings.theme);
        updateApiKeyDisplay(); // Update the display field
        navigateTo(appState.currentPage); // Go to last known page or default
        loadDashboardData(); // Initial dashboard load
        updateSchedulerList(); // Initial schedule list
        updateSettingsForm(); // Populate settings form
        console.log("AI LinkedIn Hub Initialized");
    }

    // --- State Management (localStorage) ---
    function saveState() {
        try {
            localStorage.setItem('linkedInHubState', JSON.stringify(appState));
            console.log("State saved.");
        } catch (e) {
            console.error("Error saving state to localStorage:", e);
        }
    }

    function loadState() {
        const savedState = localStorage.getItem('linkedInHubState');
        if (savedState) {
            try {
                const parsedState = JSON.parse(savedState);
                // Merge carefully to avoid overwriting functions or missing new defaults
                appState = { ...appState, ...parsedState };
                // Ensure nested objects like settings are also merged correctly
                appState.settings = { ...appState.settings, ...(parsedState.settings || {}) };
                // Convert scheduleTime back to Date objects if needed (or handle as strings)
                appState.scheduledItems = (parsedState.scheduledItems || []).map(item => ({
                     ...item,
                     scheduleTime: item.scheduleTime // Keep as ISO string for simplicity here
                }));
                 console.log("State loaded.");
            } catch (e) {
                 console.error("Error loading state from localStorage:", e);
                 // Reset to default if parsing fails
                localStorage.removeItem('linkedInHubState');
            }
        }
    }

    // --- Navigation ---
    function setupNavigation() {
        navLinks.forEach(link => {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                const pageId = link.getAttribute('data-page');
                navigateTo(pageId);
            });
        });
    }

    function navigateTo(pageId) {
        // Hide all sections
        pageSections.forEach(section => section.classList.remove('active'));

        // Show the target section
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
            appState.currentPage = pageId;
            saveState(); // Save current page
             console.log(`Navigated to: ${pageId}`);

            // Update active link style
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('data-page') === pageId) {
                    link.classList.add('active');
                }
            });

            // Trigger page-specific load functions
             if (pageId === 'dashboard-page') loadDashboardData();
             if (pageId === 'analytics-page') loadAnalyticsData();
             if (pageId === 'scheduler-page') updateSchedulerList();
             if (pageId === 'auto-posts-page') renderGeneratedPosts();
             if (pageId === 'blog-creation-page') renderGeneratedBlogs(); // Assuming a render function exists
             if (pageId === 'settings-page') updateSettingsForm(); // Update form if navigating back

        } else {
            console.error(`Page not found: ${pageId}. Navigating to dashboard.`);
            navigateTo('dashboard-page'); // Fallback
        }
    }

    // --- Theme Handling ---
    function applyTheme(theme) {
        document.body.classList.toggle('dark-theme', theme === 'dark');
        document.getElementById('current-theme').textContent = theme === 'dark' ? 'Dark' : 'Light';
        appState.settings.theme = theme;
        // Note: Chart.js might need reconfiguration for theme changes (colors)
        // If analytics page is active, reload its data to potentially redraw charts
        if (appState.currentPage === 'analytics-page') {
            loadAnalyticsData();
        }
         console.log(`Theme applied: ${theme}`);
    }

    window.toggleTheme = () => { // Make globally accessible if button onclick is used
        const newTheme = appState.settings.theme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
        saveState();
    };

    themeToggleButton.addEventListener('click', toggleTheme); // Event listener preferred

     // --- API Key Display ---
     function updateApiKeyDisplay() {
         if (apiKeyDisplay) {
             // Show only first and last few chars for obfuscation in UI
             const key = DEEPSEEK_API_KEY;
             if (key && key.length > 10) {
                 apiKeyDisplay.value = `${key.substring(0, 6)}...${key.substring(key.length - 6)}`;
             } else {
                 apiKeyDisplay.value = "Invalid Key";
             }
         }
     }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        // Buttons handled by inline onclick in HTML for simplicity,
        // but could be attached here:
        // document.getElementById('generate-posts-btn')?.addEventListener('click', generateAutoPosts);
        // document.getElementById('generate-blog-btn')?.addEventListener('click', generateBlogArticle);
        // ... etc.
    }

    // --- API Call Function ---
    async function callDeepSeek(prompt, purpose = "generation", max_tokens = 500) {
         console.log(`Calling DeepSeek for: ${purpose}`);
         setStatusMessage(purpose === 'post' ? 'post-generation-status' : 'blog-generation-status', '🤖 Thinking...', 'loading');

         // !!! SECURITY WARNING REPEATED !!!
         if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'YOUR_API_KEY_HERE' || DEEPSEEK_API_KEY.length < 10) {
             console.error("DeepSeek API Key is invalid or not configured.");
             setStatusMessage(purpose === 'post' ? 'post-generation-status' : 'blog-generation-status', '❌ Error: API Key is invalid.', 'error');
             return { error: "API Key not configured or invalid." };
         }
         if (DEEPSEEK_API_KEY === 'sk-b3c1e3c20e8d49c59ce0ee794af9874c') {
             console.warn("Using the placeholder API key. This is insecure and might be rate-limited or disabled.");
         }

         try {
             const response = await fetch(DEEPSEEK_API_URL, {
                 method: 'POST',
                 headers: {
                     'Content-Type': 'application/json',
                     'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
                 },
                 body: JSON.stringify({
                     model: 'deepseek-chat', // Use appropriate model
                     messages: [
                         { role: "system", content: `You are an expert social media manager specializing in creating trendy, persuasive, and professional content for LinkedIn. You generate content based on provided product info, company details, and current trends. Your output should be engaging and suitable for a B2B audience unless otherwise specified. Company info: ${appState.settings.companyInfo}` },
                         { role: "user", content: prompt }
                     ],
                     max_tokens: max_tokens,
                     temperature: 0.75, // Balance creativity and consistency
                     // stream: false // Set to true for streaming if needed (more complex handling)
                 })
             });

             if (!response.ok) {
                 const errorData = await response.json();
                 console.error("DeepSeek API Error:", response.status, errorData);
                 const errorMessage = `❌ API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`;
                 setStatusMessage(purpose === 'post' ? 'post-generation-status' : 'blog-generation-status', errorMessage, 'error');
                 throw new Error(errorMessage);
             }

             const data = await response.json();
             console.log("DeepSeek API Response:", data);

             if (data.choices && data.choices.length > 0 && data.choices[0].message?.content) {
                 const content = data.choices[0].message.content.trim();
                 setStatusMessage(purpose === 'post' ? 'post-generation-status' : 'blog-generation-status', '✅ Content generated successfully!', 'success');
                 // Clear status after a few seconds
                 setTimeout(() => setStatusMessage(purpose === 'post' ? 'post-generation-status' : 'blog-generation-status', '', ''), 4000);
                 return { content: content };
             } else {
                 console.error("No valid choices returned from DeepSeek API");
                 setStatusMessage(purpose === 'post' ? 'post-generation-status' : 'blog-generation-status', '❌ Error: No response content received.', 'error');
                 return { error: "No response content received from API." };
             }

         } catch (error) {
             console.error('Error calling DeepSeek API:', error);
             // Ensure the message is set even if the fetch itself failed (e.g., network error)
             if (!document.getElementById(purpose === 'post' ? 'post-generation-status' : 'blog-generation-status').textContent.includes('❌')) {
                 setStatusMessage(purpose === 'post' ? 'post-generation-status' : 'blog-generation-status', `❌ Network/Fetch Error: ${error.message}`, 'error');
             }
             return { error: `Failed to fetch from DeepSeek: ${error.message}` };
         }
     }

    // --- UI Helpers ---
    function setStatusMessage(elementId, message, type = 'info') { // type: 'info', 'loading', 'success', 'error'
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.className = `status-message ${type}`; // Add class for potential styling
            element.classList.toggle('hidden', !message); // Hide if message is empty
        }
    }

    function showLoading(buttonId) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = true;
            button.innerHTML = `<span class="spinner"></span> Generating...`; // Add a spinner class for CSS animation
        }
    }

    function hideLoading(buttonId, originalText = 'Generate') {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = false;
            button.innerHTML = originalText; // Restore original text (pass it in)
        }
    }

     function addActivityLog(message) {
        const list = document.getElementById('recent-activity-list');
        if(list) {
            const listItem = document.createElement('li');
            listItem.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            list.insertBefore(listItem, list.firstChild); // Add to top
            // Optional: limit list size
            if(list.children.length > 10) {
                list.removeChild(list.lastChild);
            }
        }
     }

     // --- Modal Handling ---
     function openModal(modalId, data = {}) {
         const modal = document.getElementById(modalId);
         if (!modal) return;

         // Populate modal content based on data
         if (modalId === 'post-preview-modal' && data.post) {
             modal.dataset.postId = data.post.id; // Store ID for saving/scheduling
             const contentArea = modal.querySelector('#modal-post-content');
             contentArea.value = data.post.content; // Use value for textarea

             // Placeholder for AI suggestions - Trigger async fetch here if needed
             const imgSuggestions = modal.querySelector('#modal-image-suggestions .photo-suggestions');
             imgSuggestions.innerHTML = '<p class="loading-indicator">Fetching image ideas...</p>';
             const headlineSuggestions = modal.querySelector('#modal-headline-suggestions ul');
             headlineSuggestions.innerHTML = '<p class="loading-indicator">Fetching headline ideas...</p>';

             fetchPostSuggestions(data.post.content, imgSuggestions, headlineSuggestions);

             // Setup buttons inside modal (example)
             document.getElementById('modal-save-btn').onclick = () => savePostChanges(data.post.id);
             document.getElementById('modal-schedule-btn').onclick = () => schedulePostFromModal(data.post.id);
         }
         // Add logic for other modals if created

         modal.classList.remove('hidden');
     }

     function closeModal(modalId) {
         const modal = document.getElementById(modalId);
         if (modal) {
             modal.classList.add('hidden');
             // Clear dynamic content if necessary
             modal.querySelector('#modal-post-content').value = '';
             modal.querySelector('#modal-image-suggestions .photo-suggestions').innerHTML = '';
             modal.querySelector('#modal-headline-suggestions ul').innerHTML = '';
             modal.dataset.postId = ''; // Clear stored ID
         }
     }

     async function fetchPostSuggestions(postContent, imgContainer, headlineContainer) {
         // Fetch Image Suggestions (keywords first)
         const imgPrompt = `Suggest 5 descriptive keywords/themes for relevant stock photos for a LinkedIn post about: "${postContent.substring(0, 150)}". List only keywords/themes, separated by commas.`;
         const imgResult = await callDeepSeek(imgPrompt, "image keywords", 100);
         if (imgResult.content) {
             const keywords = imgResult.content.split(',').map(k => k.trim()).filter(k => k);
              imgContainer.innerHTML = keywords.map(kw => `
                 <img src="https://via.placeholder.com/80x60/eee/777?text=${encodeURIComponent(kw.substring(0,8))}"
                      alt="Suggested photo for ${kw}" title="Click to use '${kw}' (simulated)">`).join('');
             // Add click handlers if needed to copy keyword/URL
         } else {
             imgContainer.innerHTML = '<p>Could not fetch image keywords.</p>';
         }

         // Fetch Headline Suggestions
         const headlinePrompt = `Generate 3 alternative, catchy headlines (max 15 words each) for a LinkedIn post starting with: "${postContent.substring(0, 100)}...". List each headline on a new line.`;
         const headlineResult = await callDeepSeek(headlinePrompt, "headlines", 150);
         if (headlineResult.content) {
             const headlines = headlineResult.content.split('\n').map(h => h.trim().replace(/^- /, '')).filter(h => h);
             headlineContainer.innerHTML = headlines.map(h => `<li>${h}</li>`).join('');
             // Add click handlers to use headline
         } else {
             headlineContainer.innerHTML = '<p>Could not fetch headlines.</p>';
         }
     }


    // --- Dashboard ---
    function loadDashboardData() {
         document.getElementById('stat-generated-today').textContent = appState.generatedPosts.filter(p => new Date(p.id).toDateString() === new Date().toDateString()).length; // Simple count for today
         document.getElementById('stat-scheduled').textContent = appState.scheduledItems.length;
         document.getElementById('stat-engagement-rate').textContent = '5.2%'; // Simulated
        fetchDashboardTrends();
        // Load recent activity (already handled by addActivityLog)
    }

    async function fetchDashboardTrends() {
        const trendsContainer = document.getElementById('dashboard-trends')?.querySelector('ul');
        if (!trendsContainer) return;
        trendsContainer.innerHTML = '<li class="loading-indicator">Loading trends...</li>';
        // Simulate news API or use DeepSeek
        const prompt = "Identify 2-3 current major trending topics relevant to professionals in technology and marketing on LinkedIn today. Briefly explain relevance.";
        const result = await callDeepSeek(prompt, "dashboard trends", 200);
        if (result.content) {
            const trends = result.content.split('\n').map(t => t.trim()).filter(t => t.length > 10);
            trendsContainer.innerHTML = trends.map(t => `<li>${t.replace(/^- /, '')}</li>`).join('');
        } else {
            trendsContainer.innerHTML = '<li>Could not fetch trends.</li>';
        }
    }


    // --- Auto-Post Generation ---
    window.generateAutoPosts = async () => { // Make global for onclick
        const category = document.getElementById('product-category-filter').value;
        const trendFocus = document.getElementById('trend-topic-filter').value;
        const count = parseInt(document.getElementById('post-count').value) || 1;
        const defaultTone = appState.settings.defaultTone || 'professional';

        showLoading('generate-posts-btn');
        setStatusMessage('post-generation-status', `🤖 Generating ${count} post(s)...`, 'loading');

        // Simulate fetching product details based on category
        let productContext = `General products/services related to ${category}.`;
        if (category !== 'all') {
            // In real app, fetch from simulated DB or API based on category
             productContext = `Product focus: ${appState.settings.productFocus || 'our products'}. Category: ${category}. Mention key benefits like [Benefit A] and [Benefit B] relevant to this category.`;
        } else {
             productContext = `Product focus: ${appState.settings.productFocus || 'our diverse range of products/services'}.`;
        }

        const prompt = `Generate ${count} unique, engaging LinkedIn posts.
        Style: ${defaultTone}, trendy, persuasive, professional.
        Company: ${appState.settings.companyInfo}
        Product Context: ${productContext}
        ${trendFocus ? `Trend Focus: Incorporate the theme of "${trendFocus}".` : "Focus on general professional interest or product benefits."}
        Format: Separate each post clearly, perhaps using "--- POST START ---" and "--- POST END ---". Include relevant hashtags for each post. Do not include headlines unless specifically asked.`;

        const result = await callDeepSeek(prompt, 'post', count * 200); // Increase max_tokens based on count

        if (result.content) {
            // Basic parsing assuming separator
            const postsRaw = result.content.split(/--- POST START ---|--- POST END ---/);
            const newPosts = postsRaw
                .map(p => p.trim())
                .filter(p => p.length > 50) // Filter out empty/short segments
                .slice(0, count); // Take requested number

            newPosts.forEach(content => {
                 const newPost = {
                    id: Date.now() + Math.random(), // Add random to avoid collision in quick generation
                    content: content,
                    suggestions: { headlines: [], images: [] }, // Can populate later
                    status: 'new'
                };
                appState.generatedPosts.unshift(newPost); // Add to beginning
            });
             addActivityLog(`Generated ${newPosts.length} new post(s).`);
            renderGeneratedPosts();
            saveState();
        } else {
            console.error("Post generation failed or returned empty content.");
            setStatusMessage('post-generation-status', `❌ Failed to generate posts. ${result.error || ''}`, 'error');
        }
        hideLoading('generate-posts-btn', '<i class="icon">✨</i> Generate Posts (AI)');
    }

    function renderGeneratedPosts() {
        const container = document.getElementById('generated-posts-container');
        if (!container) return;

        if (appState.generatedPosts.length === 0) {
            container.innerHTML = '<p>No posts generated yet. Click the button above to create some!</p>';
            return;
        }

        container.innerHTML = appState.generatedPosts.map(post => `
            <div class="post-item" data-id="${post.id}">
                <p>${post.content.replace(/\n/g, '<br>')}</p> <!-- Basic display with line breaks -->
                <div class="action-buttons">
                    <button class="small-btn" onclick="openModal('post-preview-modal', { post: getPostById(${post.id}) })">Preview & Edit</button>
                    <button class="small-btn" onclick="scheduleItem(${post.id}, 'post')">Schedule</button>
                    <button class="small-btn secondary" onclick="publishItem(${post.id}, 'post')">Publish Now (Sim.)</button>
                    <button class="small-btn danger" onclick="deleteGeneratedItem(${post.id}, 'post')">Discard</button>
                </div>
            </div>
        `).join('');
    }

     // Need helper to get post by ID for modal context
     window.getPostById = (id) => { // Make global
         return appState.generatedPosts.find(p => p.id === id);
     }

     function savePostChanges(postId) {
        const modalContent = document.getElementById('modal-post-content').value;
        const postIndex = appState.generatedPosts.findIndex(p => p.id === postId);
        if (postIndex > -1) {
            appState.generatedPosts[postIndex].content = modalContent;
            renderGeneratedPosts(); // Re-render the list
            saveState();
            closeModal('post-preview-modal');
            addActivityLog(`Edited post ID ${postId}.`);
             alert('Changes saved!');
        } else {
            alert('Error: Post not found.');
        }
     }

    // --- Blog Creation ---
     window.generateBlogArticle = async () => { // Make global
         const topic = document.getElementById('blog-topic').value;
         const audience = document.getElementById('blog-target-audience').value;
         const tone = document.getElementById('blog-tone').value;

         if (!topic) {
             alert('Please enter a topic or product focus.');
             return;
         }

         showLoading('generate-blog-btn');
         setStatusMessage('blog-generation-status', '🤖 Generating blog outline...', 'loading');

         const prompt = `Generate a structured outline for a LinkedIn article.
         Topic: "${topic}"
         Target Audience: ${audience || 'general professional audience'}
         Tone: ${tone}
         Company Context: ${appState.settings.companyInfo}
         Product Context: ${appState.settings.productFocus}
         Output: Provide a clear outline with sections (e.g., Introduction, Section 1 Title, Key Point A, Key Point B, Section 2 Title..., Conclusion). Also suggest a catchy Title for the article at the beginning, prefixed with "Title: ".`;

         const result = await callDeepSeek(prompt, 'blog', 600);

         if (result.content) {
             // Extract title and outline
             let title = `Blog Article on ${topic}`; // Default title
             let outline = result.content;
             const titleMatch = result.content.match(/^Title: (.*)(\r\n|\r|\n)/);
             if (titleMatch && titleMatch[1]) {
                 title = titleMatch[1].trim();
                 outline = result.content.substring(titleMatch[0].length).trim(); // Remove title line from outline
             }

             const newBlog = {
                 id: Date.now(),
                 title: title,
                 outline: outline,
                 content: outline, // Start content with outline
                 status: 'outline' // Or 'draft'
             };
             appState.generatedBlogs.unshift(newBlog); // Add to state
             renderGeneratedBlogs(); // Update UI
             saveState();
             addActivityLog(`Generated blog outline for "${title}".`);
             setStatusMessage('blog-generation-status', '✅ Outline generated! Edit below.', 'success');
         } else {
            setStatusMessage('blog-generation-status', `❌ Failed to generate outline. ${result.error || ''}`, 'error');
         }
         hideLoading('generate-blog-btn', '<i class="icon">💡</i> Generate Article Outline (AI)');
     }

     function renderGeneratedBlogs() {
        const container = document.getElementById('generated-blog-container');
        const editorArea = document.getElementById('blog-editor-area');

         // For simplicity, only show the latest generated blog outline for editing
         const latestBlog = appState.generatedBlogs[0]; // Get the most recent one

         if (latestBlog) {
            document.getElementById('blog-generated-title').textContent = latestBlog.title;
            document.getElementById('blog-generated-content').innerHTML = latestBlog.content.replace(/\n/g, '<br>'); // Display outline/content
            editorArea.classList.remove('hidden');
            container.querySelector('p')?.classList.add('hidden'); // Hide initial message
         } else {
             editorArea.classList.add('hidden');
             container.querySelector('p')?.classList.remove('hidden');
         }
     }

     window.refineBlogContent = async () => { // Make global
         const latestBlog = appState.generatedBlogs[0];
         if (!latestBlog) { alert('No blog content to refine.'); return; }

         const currentContent = document.getElementById('blog-generated-content').textContent; // Get text content for prompt
         setStatusMessage('blog-generation-status', '🤖 Refining content...', 'loading');

         const prompt = `Refine and expand the following LinkedIn article content/outline into a more complete draft. Keep the structure but elaborate on the points, ensuring a ${latestBlog.tone || 'professional'} tone suitable for ${latestBlog.audience || 'a professional audience'}.
         Title: ${latestBlog.title}
         Current Content/Outline:
         ---
         ${currentContent}
         ---
         Output the refined, more complete article content.`;

         const result = await callDeepSeek(prompt, 'blog', 1500); // Allow more tokens for full article

         if (result.content) {
             latestBlog.content = result.content; // Update the content in state
             document.getElementById('blog-generated-content').innerHTML = result.content.replace(/\n/g, '<br>'); // Update editor
             saveState();
             addActivityLog(`Refined blog content for "${latestBlog.title}".`);
             setStatusMessage('blog-generation-status', '✅ Content refined!', 'success');
             setTimeout(() => setStatusMessage('blog-generation-status', '', ''), 4000);
         } else {
             setStatusMessage('blog-generation-status', `❌ Failed to refine content. ${result.error || ''}`, 'error');
         }
     }

     window.scheduleBlog = () => { // Make global
         const latestBlog = appState.generatedBlogs[0];
         if (!latestBlog) { alert('No blog to schedule.'); return; }
         const finalContent = document.getElementById('blog-generated-content').innerHTML; // Get potentially edited HTML
         latestBlog.content = finalContent; // Save final edits
         scheduleItem(latestBlog.id, 'blog');
     }

     window.discardBlog = () => { // Make global
        if (appState.generatedBlogs.length > 0) {
            if(confirm(`Discard the current blog draft "${appState.generatedBlogs[0].title}"?`)) {
                const discardedTitle = appState.generatedBlogs[0].title;
                appState.generatedBlogs.shift(); // Remove the first (latest) blog
                saveState();
                renderGeneratedBlogs(); // Update UI to show nothing or next draft
                addActivityLog(`Discarded blog draft "${discardedTitle}".`);
                 setStatusMessage('blog-generation-status', `Draft discarded.`, 'info');
            }
        }
     }


    // --- Scheduling & Publishing ---
     window.scheduleItem = (itemId, itemType) => { // Make global
        const item = itemType === 'post'
            ? appState.generatedPosts.find(p => p.id === itemId)
            : appState.generatedBlogs.find(b => b.id === itemId);

         if (!item) {
             alert('Error: Item not found!'); return;
         }

         // Simple prompt for schedule time
         const scheduleTimeString = prompt(`Enter schedule time (e.g., YYYY-MM-DD HH:MM) for this ${itemType}:`, new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 16).replace('T', ' ')); // Default to 1 hour from now

         if (scheduleTimeString) {
            try {
                const scheduleTime = new Date(scheduleTimeString);
                 if (isNaN(scheduleTime.getTime())) throw new Error("Invalid date format");

                const scheduled = {
                     id: item.id, // Use original item ID or generate new? Use original for now.
                     type: itemType,
                     content: item.content, // Store the content at time of scheduling
                     title: item.title, // For blogs
                     scheduleTime: scheduleTime.toISOString() // Store as ISO string
                 };
                 appState.scheduledItems.push(scheduled);
                 appState.scheduledItems.sort((a, b) => new Date(a.scheduleTime) - new Date(b.scheduleTime)); // Keep sorted

                 // Remove from generated list (optional, depends on workflow)
                 // if (itemType === 'post') appState.generatedPosts = appState.generatedPosts.filter(p => p.id !== itemId);
                 // else appState.generatedBlogs = appState.generatedBlogs.filter(b => b.id !== itemId);

                 saveState();
                 updateSchedulerList();
                 renderGeneratedPosts(); // Update post list UI if item removed
                 renderGeneratedBlogs(); // Update blog UI if item removed
                 loadDashboardData(); // Update stats
                 addActivityLog(`Scheduled ${itemType} ID ${itemId} for ${scheduleTime.toLocaleString()}.`);
                 alert(`${capitalizeFirstLetter(itemType)} scheduled!`);
                 closeModal('post-preview-modal'); // Close modal if scheduling from there

            } catch (e) {
                 alert(`Invalid date/time format. Please use YYYY-MM-DD HH:MM. ${e.message}`);
            }
        }
     }

     function updateSchedulerList() {
        const listElement = document.getElementById('scheduled-list');
         if (!listElement) return;

         if (appState.scheduledItems.length === 0) {
             listElement.innerHTML = '<li>No items scheduled yet.</li>';
             return;
         }

         listElement.innerHTML = appState.scheduledItems.map(item => {
             const scheduleDate = new Date(item.scheduleTime);
             const isPast = scheduleDate < new Date();
             const contentPreview = item.type === 'blog'
                 ? `Blog: ${item.title || 'Untitled'}`
                 : item.content.substring(0, 60) + '...';

             return `
                 <li data-id="${item.id}" style="${isPast ? 'opacity: 0.6; border-left: 4px solid #aaa;' : ''}">
                    <span class="scheduled-time">${scheduleDate.toLocaleString()} ${isPast ? '(Past)' : ''}</span>
                    <span class="content-preview">(${item.type}) ${contentPreview}</span>
                    <span class="action-buttons">
                        <button class="small-btn danger" onclick="unscheduleItem(${item.id})">Unschedule</button>
                    </span>
                 </li>
             `;
         }).join('');
     }

     window.unscheduleItem = (itemId) => { // Make global
         if (confirm('Are you sure you want to unschedule this item?')) {
             const itemIndex = appState.scheduledItems.findIndex(item => item.id === itemId);
             if(itemIndex > -1) {
                 const item = appState.scheduledItems[itemIndex];
                 appState.scheduledItems.splice(itemIndex, 1); // Remove from schedule

                 // Optional: Add back to generated lists if needed? Depends on desired workflow.
                 // For now, just unschedule it.

                 saveState();
                 updateSchedulerList();
                 loadDashboardData(); // Update stats
                 addActivityLog(`Unscheduled ${item.type} ID ${itemId}.`);
                 alert('Item unscheduled.');
             }
         }
     }

    window.publishItem = (itemId, itemType) => { // Make global
        const item = itemType === 'post'
            ? appState.generatedPosts.find(p => p.id === itemId)
            : appState.generatedBlogs.find(b => b.id === itemId);

        if (!item) { alert('Error: Item not found!'); return; }

        if (confirm(`Simulate publishing this ${itemType} to LinkedIn now?`)) {
            console.log(`Simulating PUBLISH ${itemType} to LinkedIn:`, item);
            // --- !!! Add Real LinkedIn API Call Here (via Backend) !!! ---

             addActivityLog(`Simulated publishing ${itemType} ID ${itemId}.`);
            alert('Simulated: Item published to LinkedIn!');

             // Optional: Remove from generated/scheduled lists after publishing
             if (itemType === 'post') appState.generatedPosts = appState.generatedPosts.filter(p => p.id !== itemId);
             else appState.generatedBlogs = appState.generatedBlogs.filter(b => b.id !== itemId);
             appState.scheduledItems = appState.scheduledItems.filter(s => s.id !== itemId); // Remove if scheduled

             saveState();
             renderGeneratedPosts();
             renderGeneratedBlogs();
             updateSchedulerList();
        }
    }

     window.deleteGeneratedItem = (itemId, itemType) => { // Make global
         if (confirm(`Are you sure you want to discard this generated ${itemType}?`)) {
             if (itemType === 'post') {
                 appState.generatedPosts = appState.generatedPosts.filter(p => p.id !== itemId);
                 renderGeneratedPosts();
             } else {
                 // For blogs, assume we discard the latest one shown in editor
                 if (appState.generatedBlogs.length > 0 && appState.generatedBlogs[0].id === itemId) {
                     discardBlog(); // Use existing discard logic for the one in editor
                 } else {
                      // If logic changes to show multiple blogs, filter here:
                      appState.generatedBlogs = appState.generatedBlogs.filter(b => b.id !== itemId);
                      renderGeneratedBlogs();
                 }
             }
             saveState();
             addActivityLog(`Discarded generated ${itemType} ID ${itemId}.`);
         }
     }


    // --- Analytics ---
    let engagementChartInstance = null;
    let contentTypeChartInstance = null;

    function loadAnalyticsData() {
        renderEngagementChart();
        renderContentTypeChart();
        fetchAnalyticsInsights();
    }

    function renderEngagementChart() {
        const ctx = document.getElementById('engagementChart')?.getContext('2d');
        if (!ctx) return;

        // Mock Data
        const data = {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
            datasets: [{
                label: 'Likes (Simulated)',
                data: [65, 59, 80, 81, 96],
                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim(),
                tension: 0.1,
                 fill: false
            }, {
                label: 'Comments (Simulated)',
                data: [28, 48, 40, 19, 36],
                borderColor: '#2ecc71', // Green
                tension: 0.1,
                 fill: false
            }]
        };

         // Destroy previous chart if exists
         if (engagementChartInstance) {
             engagementChartInstance.destroy();
         }

        engagementChartInstance = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true, maintainAspectRatio: false,
                 scales: { y: { beginAtZero: true, ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() } },
                           x: { ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() } } },
                 plugins: { legend: { labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() } } }
             }
        });
    }

    function renderContentTypeChart() {
         const ctx = document.getElementById('contentTypeChart')?.getContext('2d');
         if (!ctx) return;

         const data = {
             labels: ['Product Updates', 'Blog Links', 'Trend Analysis', 'Questions'],
             datasets: [{
                 label: 'Engagement Score (Simulated)',
                 data: [75, 85, 90, 60],
                 backgroundColor: [
                     'rgba(52, 152, 219, 0.7)', // Blue
                     'rgba(26, 188, 156, 0.7)', // Teal
                     'rgba(241, 196, 15, 0.7)',  // Yellow
                     'rgba(155, 89, 182, 0.7)'   // Purple
                 ],
                 borderColor: '#fff',
                 borderWidth: 1
             }]
         };

         if (contentTypeChartInstance) {
             contentTypeChartInstance.destroy();
         }

         contentTypeChartInstance = new Chart(ctx, {
             type: 'doughnut', // Or 'pie'
             data: data,
             options: {
                 responsive: true, maintainAspectRatio: false,
                 plugins: { legend: { position: 'top', labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() } } }
             }
         });
     }

     window.fetchAnalyticsInsights = async () => { // Make global
         const insightsContainer = document.getElementById('analytics-insights')?.querySelector('ul');
         if (!insightsContainer) return;
         insightsContainer.innerHTML = '<li class="loading-indicator">Generating insights...</li>';

         // In real app, send actual analytics data
         const prompt = `Based on general LinkedIn best practices and simulated data showing Trend Analysis posts perform well, provide 3 actionable insights for improving content strategy.`;
         const result = await callDeepSeek(prompt, "analytics insights", 200);

         if (result.content) {
             const insights = result.content.split('\n').map(i => i.trim().replace(/^- |^\* |^\d\. /, '')).filter(i => i.length > 10);
             insightsContainer.innerHTML = insights.map(i => `<li>${i}</li>`).join('');
         } else {
              insightsContainer.innerHTML = `
                <li>Simulated Insight: Focus more on Trend Analysis posts.</li>
                <li>Simulated Insight: Experiment with asking direct questions to boost comments.</li>
                <li>Simulated Insight: Ensure Blog Link posts have compelling hooks.</li>
              `; // Fallback simulation
         }
     }

    // --- Settings ---
    function updateSettingsForm() {
        document.getElementById('setting-product-data').value = appState.settings.productFocus || '';
        document.getElementById('setting-company-info').value = appState.settings.companyInfo || '';
        document.getElementById('setting-default-tone').value = appState.settings.defaultTone || 'professional';
         applyTheme(appState.settings.theme); // Ensure theme display is correct
    }

    window.saveSettings = () => { // Make global
        appState.settings.productFocus = document.getElementById('setting-product-data').value;
        appState.settings.companyInfo = document.getElementById('setting-company-info').value;
        appState.settings.defaultTone = document.getElementById('setting-default-tone').value;
        // Theme is saved via applyTheme

        saveState();
        addActivityLog("Settings updated.");
         const msgElement = document.querySelector('.settings-saved-message');
         msgElement.classList.remove('hidden');
         setTimeout(() => msgElement.classList.add('hidden'), 3000);
        alert('Settings saved!');
    }

    // --- Utility ---
     function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // --- Start the App ---
    init();

}); // End DOMContentLoaded