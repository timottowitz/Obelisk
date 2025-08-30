import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface VerificationState {
  // Selected entity for highlighting and focus
  selectedEntityId: string | null;
  
  // Focus mode state - dims non-highlighted text
  isFocusModeActive: boolean;
  
  // Document viewer scroll position tracking
  documentScrollPosition: number;
  
  // Entity refs for scroll-to-view functionality
  entityRefs: Record<string, HTMLElement | null>;
  
  // Actions
  selectEntity: (entityId: string | null) => void;
  toggleFocusMode: () => void;
  setFocusMode: (active: boolean) => void;
  setDocumentScrollPosition: (position: number) => void;
  registerEntityRef: (entityId: string, element: HTMLElement | null) => void;
  scrollToEntity: (entityId: string) => void;
  clearSelection: () => void;
}

export const useVerificationStore = create<VerificationState>()(
  devtools(
    (set, get) => ({
      // Initial state
      selectedEntityId: null,
      isFocusModeActive: false,
      documentScrollPosition: 0,
      entityRefs: {},

      // Actions
      selectEntity: (entityId) => {
        const currentSelection = get().selectedEntityId;
        
        // If same entity is selected, deselect it
        if (currentSelection === entityId) {
          set({ 
            selectedEntityId: null,
            isFocusModeActive: false 
          });
          return;
        }
        
        // Select new entity and activate focus mode
        set({ 
          selectedEntityId: entityId,
          isFocusModeActive: entityId !== null 
        });
        
        // Scroll to entity if available
        if (entityId) {
          get().scrollToEntity(entityId);
        }
      },

      toggleFocusMode: () => {
        set((state) => ({ 
          isFocusModeActive: !state.isFocusModeActive 
        }));
      },

      setFocusMode: (active) => {
        set({ isFocusModeActive: active });
      },

      setDocumentScrollPosition: (position) => {
        set({ documentScrollPosition: position });
      },

      registerEntityRef: (entityId, element) => {
        set((state) => ({
          entityRefs: {
            ...state.entityRefs,
            [entityId]: element
          }
        }));
      },

      scrollToEntity: (entityId) => {
        const { entityRefs } = get();
        const entityElement = entityRefs[entityId];
        
        if (entityElement) {
          // Scroll to element with smooth behavior
          entityElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
          
          // Optional: Add temporary highlight effect
          entityElement.classList.add('entity-highlight-flash');
          setTimeout(() => {
            entityElement.classList.remove('entity-highlight-flash');
          }, 1000);
        }
      },

      clearSelection: () => {
        set({
          selectedEntityId: null,
          isFocusModeActive: false
        });
      }
    }),
    {
      name: 'verification-store',
      // Only log actions in development
      enabled: process.env.NODE_ENV === 'development'
    }
  )
);

// Selector hooks for optimized subscriptions
export const useSelectedEntity = () => useVerificationStore(state => state.selectedEntityId);
export const useFocusMode = () => useVerificationStore(state => state.isFocusModeActive);
export const useVerificationActions = () => useVerificationStore(state => ({
  selectEntity: state.selectEntity,
  toggleFocusMode: state.toggleFocusMode,
  setFocusMode: state.setFocusMode,
  clearSelection: state.clearSelection,
  registerEntityRef: state.registerEntityRef,
  scrollToEntity: state.scrollToEntity
}));