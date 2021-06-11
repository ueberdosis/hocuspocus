<template>
  <div class="page">
    <nav>
      <ul>
        <li><a href="/">Default</a></li>
        <li><a href="/awareness">Awareness</a></li>
        <li><a href="/rooms">Rooms</a></li>
        <li><a href="/messages">Messages</a></li>
        <li><a href="/subdocuments">Subdocuments</a></li>
      </ul>
    </nav>
    <slot />
  </div>
</template>

<style>
.page {
  font-family: sans-serif;
}
</style>
