import { createRouter, createWebHistory } from "vue-router";
import CreateDrop from "./views/CreateDrop.vue";
import DropView from "./views/DropView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: CreateDrop,
    },
    {
      path: "/drop/:id",
      component: DropView,
    },
  ],
});

export default router;
