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
          <li>
            <router-link
              class="block px-8 py-3"
              to="/subdocuments2"
            >
              Subdocuments2
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
