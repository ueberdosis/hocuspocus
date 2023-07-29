<template>
  <div class="min-h-screen flex flex-col">
    <header class="border-b px-8 py-6 font-bold">
      Playground
    </header>
    <div class="flex flex-grow">
      <nav class="w-60 pt-4 border-r">
        <ul>
          <li>
            <router-link
              class="block px-8 py-3"
              to="/collab"
            >
              TiptapCollab
            </router-link>
          </li>
          <li>
            <router-link
              class="block px-8 py-3"
              to="/"
            >
              Text editing
            </router-link>
          </li>
          <li>
            <router-link
              class="block px-8 py-3"
              to="/awareness"
            >
              Awareness
            </router-link>
          </li>
          <li>
            <router-link
              class="block px-8 py-3"
              to="/rooms"
            >
              Rooms
            </router-link>
          </li>
          <li>
            <router-link
              class="block px-8 py-3"
              to="/messages"
            >
              Messages
            </router-link>
          </li>
          <li>
            <router-link
              class="block px-8 py-3"
              to="/subdocuments"
            >
              Subdocuments
            </router-link>
          </li>
        </ul>
      </nav>
      <main class="flex-grow mt-4 px-8 py-4">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style>
.special-button {
  border-radius: 8px;
  background-color: #155EFA;
  color: #FFFFFF;
  padding: 8px 16px;
}

pre {
  background: #0d0d0d;
  color: #fff;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
}

code {
  color: inherit;
  padding: 0;
  background: none;
  font-size: 0.8rem;
}
</style>
