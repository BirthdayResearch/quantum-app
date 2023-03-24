import { combineReducers } from "@reduxjs/toolkit";
import versionSlice from "@store/slices/versionSlice";
import { bridgeApi } from "@store/defichain";

const rootReducer = combineReducers({
  [bridgeApi.reducerPath]: bridgeApi.reducer,
  version: versionSlice,
});
export type RootState = ReturnType<typeof rootReducer>;

export default rootReducer;
