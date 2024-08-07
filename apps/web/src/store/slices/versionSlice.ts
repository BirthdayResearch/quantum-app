import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { bridgeApi } from "@store/defichain";
import type { RootState } from "@store/reducers/rootReducer";

const versionSlice = createSlice({
  name: "version",
  initialState: "0.0.0",
  reducers: {
    setVersion: (state, action: PayloadAction<string>) => action.payload,
  },
  extraReducers: (builder) => {
    builder.addMatcher(
      bridgeApi.endpoints.bridgeVersion.matchFulfilled,
      (_, { payload }) => payload.v,
    );
  },
});

export const { setVersion } = versionSlice.actions;
export default versionSlice.reducer;

export const selectVersion = (state: RootState) => state.version;
